import { prisma } from "../config/prisma";
import type {
  CreateApplicationInput,
  UpdateApplicationInput,
} from "../validators/application.validator";

export const applicationService = {
  list() {
    return prisma.application.findMany({ orderBy: { createdAt: "desc" } });
  },

  create(data: CreateApplicationInput) {
    return prisma.application.create({ data });
  },

  findById(id: string) {
    return prisma.application.findUnique({ where: { id } });
  },

  async update(id: string, data: UpdateApplicationInput) {
    const result = await prisma.application.updateMany({
      where: { id },
      data,
    });

    return result.count === 0 ? null : this.findById(id);
  },

  async remove(id: string) {
    const result = await prisma.application.deleteMany({ where: { id } });
    return result.count > 0;
  },
};
