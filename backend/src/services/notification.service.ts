import nodemailer from "nodemailer";
import webPush from "web-push";
import { prisma } from "../config/prisma";
import type { NotificationPreferenceInput, PushSubscriptionInput } from "../validators/notification.validator";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
const vapidSubject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@example.com";
const smtpHost = process.env.SMTP_HOST?.trim() ?? "";
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpFrom = process.env.SMTP_FROM?.trim() ?? "";

if (vapidPublicKey && vapidPrivateKey) webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

const mailTransport = smtpHost && smtpFrom ? nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
}) : null;

function publicSettings(preference: { emailEnabled: boolean; browserPushEnabled: boolean } | null, pushSubscriptionCount: number) {
  return {
    emailEnabled: preference?.emailEnabled ?? false,
    browserPushEnabled: preference?.browserPushEnabled ?? false,
    emailAvailable: Boolean(mailTransport),
    browserPushAvailable: Boolean(vapidPublicKey && vapidPrivateKey),
    vapidPublicKey: vapidPublicKey || null,
    browserSubscribed: pushSubscriptionCount > 0,
  };
}

export const notificationService = {
  async getSettings(userId: string) {
    const [preference, pushSubscriptionCount] = await Promise.all([
      prisma.notificationPreference.findUnique({ where: { userId } }),
      prisma.pushSubscription.count({ where: { userId } }),
    ]);
    return publicSettings(preference, pushSubscriptionCount);
  },

  async updateSettings(userId: string, input: NotificationPreferenceInput) {
    const preference = await prisma.notificationPreference.upsert({
      where: { userId }, create: { userId, ...input }, update: input,
    });
    const pushSubscriptionCount = await prisma.pushSubscription.count({ where: { userId } });
    return publicSettings(preference, pushSubscriptionCount);
  },

  async subscribe(userId: string, input: PushSubscriptionInput) {
    return prisma.$transaction(async (transaction) => {
      const existing = await transaction.pushSubscription.findUnique({ where: { endpoint: input.endpoint }, select: { userId: true } });
      if (existing && existing.userId !== userId) return false;
      await transaction.pushSubscription.upsert({
        where: { endpoint: input.endpoint },
        create: { userId, endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth },
        update: { p256dh: input.keys.p256dh, auth: input.keys.auth },
      });
      return true;
    });
  },

  async unsubscribe(userId: string, endpoint: string) {
    await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  },

  async deliverDueReminders(now = new Date()) {
    const reminders = await prisma.applicationReminder.findMany({
      where: {
        dueAt: { lte: now },
        completedAt: null,
        OR: [
          { application: { user: { notificationPreference: { is: { emailEnabled: true } } } }, deliveries: { none: { channel: "EMAIL" } } },
          { application: { user: { notificationPreference: { is: { browserPushEnabled: true } }, pushSubscriptions: { some: {} } } }, deliveries: { none: { channel: "WEB_PUSH" } } },
        ],
      },
      include: {
        deliveries: { select: { channel: true } },
        application: { include: { user: { include: { notificationPreference: true, pushSubscriptions: true } } } },
      },
      orderBy: { dueAt: "asc" }, take: 100,
    });

    for (const reminder of reminders) {
      const user = reminder.application.user;
      if (!user?.notificationPreference) continue;
      const delivered = new Set(reminder.deliveries.map(({ channel }) => channel));
      const title = `${reminder.type === "DEADLINE" ? "Deadline" : "Follow-up"}: ${reminder.application.company}`;
      const text = `${reminder.description} — ${reminder.application.jobTitle}`;

      if (user.notificationPreference.emailEnabled && mailTransport && !delivered.has("EMAIL")) {
        await mailTransport.sendMail({ from: smtpFrom, to: user.email, subject: title, text });
        await prisma.reminderDelivery.create({ data: { reminderId: reminder.id, channel: "EMAIL" } });
      }

      if (user.notificationPreference.browserPushEnabled && vapidPublicKey && !delivered.has("WEB_PUSH")) {
        const payload = JSON.stringify({ title, body: text, url: `/applications/${reminder.applicationId}` });
        let sent = false;
        for (const subscription of user.pushSubscriptions) {
          try {
            await webPush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload);
            sent = true;
          } catch (error) {
            const statusCode = typeof error === "object" && error && "statusCode" in error ? error.statusCode : null;
            if (statusCode === 404 || statusCode === 410) {
              await prisma.pushSubscription.delete({ where: { id: subscription.id } });
              continue;
            }
            throw error;
          }
        }
        if (sent) await prisma.reminderDelivery.create({ data: { reminderId: reminder.id, channel: "WEB_PUSH" } });
      }
    }
  },
};
