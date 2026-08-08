import { prisma } from "../config/prisma";
import type {
  CreateApplicationInput,
  UpdateApplicationInput,
} from "../validators/application.validator";

export const applicationService = {
  list(userId: string) {
    return prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  create(userId: string, data: CreateApplicationInput) {
    return prisma.application.create({ data: { ...data, userId } });
  },

  findById(userId: string, id: string) {
    return prisma.application.findFirst({ where: { id, userId } });
  },

  async update(userId: string, id: string, data: UpdateApplicationInput) {
    return prisma.$transaction(async (transaction) => {
      const existing = await transaction.application.findFirst({
        where: { id, userId },
      });

      if (!existing) return null;

      const application = await transaction.application.update({
        where: { id },
        data,
      });

      if (data.status && data.status !== existing.status) {
        await transaction.applicationEvent.create({
          data: {
            applicationId: id,
            type: "STATUS_CHANGE",
            description: `Status changed from ${existing.status} to ${data.status}`,
            fromStatus: existing.status,
            toStatus: data.status,
          },
        });
      }

      return application;
    });
  },

  async remove(userId: string, id: string) {
    const result = await prisma.application.deleteMany({ where: { id, userId } });
    return result.count > 0;
  },
};
