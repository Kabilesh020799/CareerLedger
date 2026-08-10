import { prisma } from "../config/prisma";
import type { Prisma } from "../generated/prisma/client";
import type { ApplicationDiscoveryInput } from "../validators/application-discovery.validator";
import type {
  CreateApplicationInput,
  UpdateApplicationInput,
} from "../validators/application.validator";
import type { ApplicationResumeAttachmentInput } from "../validators/application-resume.validator";
import { applicationResumeCreateData } from "./application-resume.service";
import { applicationResumeStorageService } from "./application-resume-storage.service";

export const applicationService = {
  list(userId: string) {
    return prisma.application.findMany({
      where: { userId },
      include: applicationInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  async search(userId: string, query: ApplicationDiscoveryInput) {
    const where: Prisma.ApplicationWhereInput = {
      userId,
      ...(query.search
        ? {
            OR: [
              { company: { contains: query.search, mode: "insensitive" } },
              { jobTitle: { contains: query.search, mode: "insensitive" } },
              { location: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.source
        ? { source: { equals: query.source, mode: "insensitive" } }
        : {}),
      ...(query.appliedFrom || query.appliedTo
        ? {
            appliedAt: {
              ...(query.appliedFrom ? { gte: query.appliedFrom } : {}),
              ...(query.appliedTo ? { lte: query.appliedTo } : {}),
            },
          }
        : {}),
    };
    const orderBy = applicationOrderBy(query.sortBy, query.sortOrder);

    const [total, data] = await prisma.$transaction([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        include: applicationInclude,
        orderBy: [orderBy, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    };
  },

  create(
    userId: string,
    data: CreateApplicationInput,
    resume?: ApplicationResumeAttachmentInput,
  ) {
    return prisma.$transaction(async (transaction) => {
      const { resumeUploadKey: _resumeUploadKey, ...applicationData } = data;
      if (applicationData.resumeVersionId) {
        const resumeVersion = await transaction.resumeVersion.findFirst({
          where: { id: applicationData.resumeVersionId, userId },
          select: { id: true },
        });
        if (!resumeVersion) return null;
      }

      return transaction.application.create({
        data: {
          ...applicationData,
          userId,
          ...(resume
            ? {
                resumeAttachment: {
                  create: applicationResumeCreateData(
                    applicationData.jobTitle,
                    applicationData.company,
                    resume,
                  ),
                },
              }
            : {}),
        },
        include: applicationInclude,
      });
    });
  },

  findById(userId: string, id: string) {
    return prisma.application.findFirst({
      where: { id, userId },
      include: applicationInclude,
    });
  },

  async update(
    userId: string,
    id: string,
    data: UpdateApplicationInput,
    resume?: ApplicationResumeAttachmentInput,
  ) {
    const result = await prisma.$transaction(async (transaction) => {
      const { resumeUploadKey: _resumeUploadKey, ...applicationData } = data;
      const existing = await transaction.application.findFirst({
        where: { id, userId },
        include: { resumeAttachment: { select: { storageKey: true } } },
      });

      if (!existing) return null;

      if (applicationData.resumeVersionId) {
        const resumeVersion = await transaction.resumeVersion.findFirst({
          where: { id: applicationData.resumeVersionId, userId },
          select: { id: true },
        });
        if (!resumeVersion) return false;
      }

      const application = await transaction.application.update({
        where: { id },
        data: {
          ...applicationData,
          ...(resume
            ? {
                resumeAttachment: {
                  upsert: {
                    create: applicationResumeCreateData(
                      applicationData.jobTitle ?? existing.jobTitle,
                      applicationData.company ?? existing.company,
                      resume,
                    ),
                    update: applicationResumeCreateData(
                      applicationData.jobTitle ?? existing.jobTitle,
                      applicationData.company ?? existing.company,
                      resume,
                    ),
                  },
                },
              }
            : {}),
        },
        include: applicationInclude,
      });

      if (
        applicationData.status &&
        applicationData.status !== existing.status
      ) {
        await transaction.applicationEvent.create({
          data: {
            applicationId: id,
            type: "STATUS_CHANGE",
            description: `Status changed from ${existing.status} to ${applicationData.status}`,
            fromStatus: existing.status,
            toStatus: applicationData.status,
          },
        });
      }

      const previousStorageKey = existing.resumeAttachment?.storageKey;
      const nextStorageKey =
        resume && "storageKey" in resume ? resume.storageKey : undefined;
      const storageKeyToDelete =
        resume && previousStorageKey && previousStorageKey !== nextStorageKey
          ? previousStorageKey
          : undefined;
      if (storageKeyToDelete) {
        await transaction.resumeObjectDeletion.upsert({
          where: { storageKey: storageKeyToDelete },
          create: { storageKey: storageKeyToDelete },
          update: {},
        });
      }

      return { application, storageKeyToDelete };
    });

    if (result === null || result === false) return result;
    if (result.storageKeyToDelete) {
      await applicationResumeStorageService.processQueuedDeletion(
        result.storageKeyToDelete,
      );
    }
    return result.application;
  },

  async remove(userId: string, id: string) {
    const result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.application.findFirst({
        where: { id, userId },
        select: {
          id: true,
          resumeAttachment: { select: { storageKey: true } },
        },
      });
      if (!existing) return null;

      const storageKey = existing.resumeAttachment?.storageKey;
      if (storageKey) {
        await transaction.resumeObjectDeletion.upsert({
          where: { storageKey },
          create: { storageKey },
          update: {},
        });
      }
      await transaction.application.delete({ where: { id } });
      return { storageKey };
    });

    if (!result) return false;
    if (result.storageKey) {
      await applicationResumeStorageService.processQueuedDeletion(
        result.storageKey,
      );
    }
    return true;
  },
};

const applicationInclude = {
  resumeVersion: {
    select: { id: true, name: true, notes: true },
  },
  resumeAttachment: {
    select: {
      fileName: true,
      mimeType: true,
      size: true,
      createdAt: true,
    },
  },
} satisfies Prisma.ApplicationInclude;

function applicationOrderBy(
  sortBy: ApplicationDiscoveryInput["sortBy"],
  sortOrder: ApplicationDiscoveryInput["sortOrder"],
): Prisma.ApplicationOrderByWithRelationInput {
  switch (sortBy) {
    case "appliedAt":
      return { appliedAt: { sort: sortOrder, nulls: "last" } };
    case "company":
      return { company: sortOrder };
    case "updatedAt":
      return { updatedAt: sortOrder };
    case "createdAt":
      return { createdAt: sortOrder };
  }
}
