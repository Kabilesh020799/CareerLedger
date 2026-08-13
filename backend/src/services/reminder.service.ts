import { prisma } from "../config/prisma";
import type { Prisma } from "../generated/prisma/client";
import type { CreateReminderInput } from "../validators/reminder.validator";
import { applicationAccess } from "./workspace-access.service";

const FOLLOW_UP_INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000;
const SUGGESTED_DUE_DELAY_MS = 24 * 60 * 60 * 1000;

function followUpSuggestionWhere(
  userId: string,
  inactiveBefore: Date,
  applicationId?: string,
): Prisma.ApplicationWhereInput {
  return {
    ...(applicationId ? { id: applicationId } : {}),
    userId,
    status: "APPLIED",
    updatedAt: { lt: inactiveBefore },
    events: { none: { createdAt: { gte: inactiveBefore } } },
    reminders: { none: { type: "FOLLOW_UP" } },
  };
}

export const reminderService = {
  async listForApplication(userId: string, applicationId: string, workspaceId?: string) {
    const access = await applicationAccess(userId, workspaceId);
    const application = await prisma.application.findFirst({
      where: { ...access.where, id: applicationId },
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

  async listOpen(userId: string, workspaceId?: string) {
    const access = await applicationAccess(userId, workspaceId);
    return prisma.applicationReminder.findMany({
      where: {
        completedAt: null,
        application: access.where,
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

  async listFollowUpSuggestions(userId: string, now = new Date()) {
    const inactiveBefore = new Date(now.getTime() - FOLLOW_UP_INACTIVITY_MS);
    const applications = await prisma.application.findMany({
      where: followUpSuggestionWhere(userId, inactiveBefore),
      select: {
        id: true,
        company: true,
        jobTitle: true,
        updatedAt: true,
        events: {
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
          take: 1,
        },
      },
      orderBy: { updatedAt: "asc" },
      take: 20,
    });

    return applications.map(({ events, ...application }) => ({
      application: {
        id: application.id,
        company: application.company,
        jobTitle: application.jobTitle,
      },
      lastActivityAt:
        events[0]?.createdAt && events[0].createdAt > application.updatedAt
          ? events[0].createdAt
          : application.updatedAt,
    }));
  },

  createSuggestedFollowUp(
    userId: string,
    applicationId: string,
    now = new Date(),
  ) {
    const inactiveBefore = new Date(now.getTime() - FOLLOW_UP_INACTIVITY_MS);

    return prisma.$transaction(async (transaction) => {
      const application = await transaction.application.findFirst({
        where: followUpSuggestionWhere(userId, inactiveBefore, applicationId),
        select: { id: true, company: true },
      });

      if (!application) return null;

      return transaction.applicationReminder.create({
        data: {
          applicationId: application.id,
          type: "FOLLOW_UP",
          description: `Follow up with ${application.company}`,
          dueAt: new Date(now.getTime() + SUGGESTED_DUE_DELAY_MS),
        },
      });
    });
  },

  create(userId: string, applicationId: string, data: CreateReminderInput, workspaceId?: string) {
    return prisma.$transaction(async (transaction) => {
      const access = await applicationAccess(userId, workspaceId, true);
      const application = await transaction.application.findFirst({
        where: { ...access.where, id: applicationId },
        select: { id: true },
      });

      if (!application) return null;

      return transaction.applicationReminder.create({
        data: { ...data, applicationId },
      });
    });
  },

  updateCompletion(userId: string, id: string, completed: boolean, workspaceId?: string) {
    return prisma.$transaction(async (transaction) => {
      const access = await applicationAccess(userId, workspaceId, true);
      const reminder = await transaction.applicationReminder.findFirst({
        where: { id, application: access.where },
        select: { id: true },
      });

      if (!reminder) return null;

      return transaction.applicationReminder.update({
        where: { id },
        data: { completedAt: completed ? new Date() : null },
      });
    });
  },

  async remove(userId: string, id: string, workspaceId?: string) {
    const access = await applicationAccess(userId, workspaceId, true);
    const result = await prisma.applicationReminder.deleteMany({
      where: { id, application: access.where },
    });
    return result.count > 0;
  },
};
