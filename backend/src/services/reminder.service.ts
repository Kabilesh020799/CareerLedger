import { prisma } from "../config/prisma";
import type { CreateReminderInput } from "../validators/reminder.validator";

export const reminderService = {
  async listForApplication(userId: string, applicationId: string) {
    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId },
      select: {
        reminders: {
          orderBy: [
            { completedAt: { sort: "asc", nulls: "first" } },
            { dueAt: "asc" },
          ],
        },
      },
    });

    return application?.reminders ?? null;
  },

  listOpen(userId: string) {
    return prisma.applicationReminder.findMany({
      where: {
        completedAt: null,
        application: { userId },
      },
      include: {
        application: {
          select: { id: true, company: true, jobTitle: true },
        },
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      take: 50,
    });
  },

  create(userId: string, applicationId: string, data: CreateReminderInput) {
    return prisma.$transaction(async (transaction) => {
      const application = await transaction.application.findFirst({
        where: { id: applicationId, userId },
        select: { id: true },
      });

      if (!application) return null;

      return transaction.applicationReminder.create({
        data: { ...data, applicationId },
      });
    });
  },

  updateCompletion(userId: string, id: string, completed: boolean) {
    return prisma.$transaction(async (transaction) => {
      const reminder = await transaction.applicationReminder.findFirst({
        where: { id, application: { userId } },
        select: { id: true },
      });

      if (!reminder) return null;

      return transaction.applicationReminder.update({
        where: { id },
        data: { completedAt: completed ? new Date() : null },
      });
    });
  },

  async remove(userId: string, id: string) {
    const result = await prisma.applicationReminder.deleteMany({
      where: { id, application: { userId } },
    });
    return result.count > 0;
  },
};
