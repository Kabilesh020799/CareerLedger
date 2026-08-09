import { prisma } from "../config/prisma";
import type {
  CreateResumeVersionInput,
  UpdateResumeVersionInput,
} from "../validators/resume-version.validator";

export type ResumeVersionCreateResult<T> =
  | { kind: "success"; data: T }
  | { kind: "conflict" };

export type ResumeVersionUpdateResult<T> =
  | ResumeVersionCreateResult<T>
  | { kind: "not_found" };

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export const resumeVersionService = {
  list(userId: string) {
    return prisma.resumeVersion.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    });
  },

  async create(
    userId: string,
    data: CreateResumeVersionInput,
  ): Promise<ResumeVersionCreateResult<unknown>> {
    try {
      const resumeVersion = await prisma.resumeVersion.create({
        data: { ...data, userId },
      });
      return { kind: "success", data: resumeVersion };
    } catch (error) {
      if (isUniqueConstraintError(error)) return { kind: "conflict" };
      throw error;
    }
  },

  async update(
    userId: string,
    id: string,
    data: UpdateResumeVersionInput,
  ): Promise<ResumeVersionUpdateResult<unknown>> {
    try {
      return await prisma.$transaction(async (transaction) => {
        const existing = await transaction.resumeVersion.findFirst({
          where: { id, userId },
          select: { id: true },
        });
        if (!existing) return { kind: "not_found" } as const;

        const resumeVersion = await transaction.resumeVersion.update({
          where: { id },
          data,
        });
        return { kind: "success", data: resumeVersion } as const;
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) return { kind: "conflict" };
      throw error;
    }
  },

  async remove(userId: string, id: string) {
    const result = await prisma.resumeVersion.deleteMany({
      where: { id, userId },
    });
    return result.count > 0;
  },
};
