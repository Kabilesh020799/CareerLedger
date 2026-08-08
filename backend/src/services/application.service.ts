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
    const result = await prisma.application.updateMany({
      where: { id, userId },
      data,
    });

    return result.count === 0 ? null : this.findById(userId, id);
  },

  async remove(userId: string, id: string) {
    const result = await prisma.application.deleteMany({ where: { id, userId } });
    return result.count > 0;
  },
};
