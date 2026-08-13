import { prisma } from "../config/prisma";
import type { CreateApplicationEventInput } from "../validators/application-event.validator";
import { applicationAccess } from "./workspace-access.service";

export const applicationEventService = {
  async list(userId: string, applicationId: string, workspaceId?: string) {
    const access = await applicationAccess(userId, workspaceId);
    const application = await prisma.application.findFirst({
      where: { ...access.where, id: applicationId },
      select: {
        events: {
          orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    return application?.events ?? null;
  },

  create(
    userId: string,
    applicationId: string,
    data: CreateApplicationEventInput,
    workspaceId?: string,
  ) {
    return prisma.$transaction(async (transaction) => {
      const access = await applicationAccess(userId, workspaceId, true);
      const application = await transaction.application.findFirst({
        where: { ...access.where, id: applicationId },
        select: { id: true },
      });

      if (!application) return null;

      return transaction.applicationEvent.create({
        data: {
          applicationId,
          type: data.type,
          description: data.description,
          occurredAt: data.occurredAt,
        },
      });
    });
  },
};
