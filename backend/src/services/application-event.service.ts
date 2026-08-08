import { prisma } from "../config/prisma";
import type { CreateApplicationEventInput } from "../validators/application-event.validator";

export const applicationEventService = {
  async list(userId: string, applicationId: string) {
    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId },
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
  ) {
    return prisma.$transaction(async (transaction) => {
      const application = await transaction.application.findFirst({
        where: { id: applicationId, userId },
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
