import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendMail: vi.fn(), sendNotification: vi.fn(), setVapidDetails: vi.fn(),
  prisma: {
    notificationPreference: { findUnique: vi.fn(), upsert: vi.fn() }, pushSubscription: { count: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn(), delete: vi.fn() },
    applicationReminder: { findMany: vi.fn() }, reminderDelivery: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("../config/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail: mocks.sendMail }) } }));
vi.mock("web-push", () => ({ default: { setVapidDetails: mocks.setVapidDetails, sendNotification: mocks.sendNotification } }));

describe("notificationService", () => {
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks();
    vi.stubEnv("SMTP_HOST", "smtp.example.com"); vi.stubEnv("SMTP_FROM", "tracker@example.com");
    vi.stubEnv("VAPID_PUBLIC_KEY", "public-key"); vi.stubEnv("VAPID_PRIVATE_KEY", "private-key");
    mocks.prisma.$transaction.mockImplementation((callback) => callback(mocks.prisma));
  });

  it("does not transfer another user's push endpoint", async () => {
    mocks.prisma.pushSubscription.findUnique.mockResolvedValue({ userId: "user-2" });
    const { notificationService } = await import("./notification.service");
    await expect(notificationService.subscribe("user-1", { endpoint: "https://push.example/1", keys: { p256dh: "key", auth: "auth" } })).resolves.toBe(false);
    expect(mocks.prisma.pushSubscription.upsert).not.toHaveBeenCalled();
  });

  it("returns capabilities and persists user preferences", async () => {
    mocks.prisma.notificationPreference.findUnique.mockResolvedValue(null);
    mocks.prisma.pushSubscription.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    mocks.prisma.notificationPreference.upsert.mockResolvedValue({ emailEnabled: true, browserPushEnabled: true });
    const { notificationService } = await import("./notification.service");
    await expect(notificationService.getSettings("user-1")).resolves.toMatchObject({ emailAvailable: true, browserPushAvailable: true, emailEnabled: false });
    await expect(notificationService.updateSettings("user-1", { emailEnabled: true, browserPushEnabled: true })).resolves.toMatchObject({ emailEnabled: true, browserSubscribed: true });
  });

  it("delivers each due reminder through enabled undelivered channels", async () => {
    mocks.prisma.applicationReminder.findMany.mockResolvedValue([{ id: "reminder-1", applicationId: "app-1", type: "FOLLOW_UP", description: "Send a note", deliveries: [], application: { company: "Acme", jobTitle: "Engineer", user: { email: "user@example.com", notificationPreference: { emailEnabled: true, browserPushEnabled: true }, pushSubscriptions: [{ id: "push-1", endpoint: "https://push.example/1", p256dh: "key", auth: "auth" }] } } }]);
    mocks.sendMail.mockResolvedValue({}); mocks.sendNotification.mockResolvedValue({}); mocks.prisma.reminderDelivery.create.mockResolvedValue({});
    const { notificationService } = await import("./notification.service");
    await notificationService.deliverDueReminders(new Date("2026-08-10T20:00:00Z"));
    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "user@example.com" }));
    expect(mocks.sendNotification).toHaveBeenCalledOnce();
    expect(mocks.prisma.reminderDelivery.create).toHaveBeenCalledTimes(2);
  });
});
