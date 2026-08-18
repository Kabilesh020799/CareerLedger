import { prisma } from "../config/prisma";
import type { Prisma } from "../generated/prisma/client";
import type { ApplicationDiscoveryInput } from "../validators/application-discovery.validator";
import type {
  CreateApplicationInput,
  UpdateApplicationInput,
} from "../validators/application.validator";
import type { ApplicationResumeAttachmentInput } from "../validators/application-resume.validator";
import type { ApplicationCoverLetterAttachmentInput } from "../validators/application-cover-letter.validator";
import { applicationResumeCreateData } from "./application-resume.service";
import { applicationResumeStorageService } from "./application-resume-storage.service";
import { applicationCoverLetterCreateData } from "./application-cover-letter.service";
import { applicationAccess } from "./workspace-access.service";

export const applicationService = {
  async list(userId: string, workspaceId?: string) {
    const access = await applicationAccess(userId, workspaceId);
    return prisma.application.findMany({
      where: access.where,
      include: applicationInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  async search(userId: string, query: ApplicationDiscoveryInput, workspaceId?: string) {
    const access = await applicationAccess(userId, workspaceId);
    const where: Prisma.ApplicationWhereInput = {
      ...access.where,
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
    workspaceId?: string,
    coverLetter?: ApplicationCoverLetterAttachmentInput,
  ) {
    return prisma.$transaction(async (transaction) => {
      const access = await applicationAccess(userId, workspaceId, true);
      const { resumeUploadKey: _resumeUploadKey, coverLetterUploadKey: _coverLetterUploadKey, ...applicationData } = data;
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
          ...(access.workspaceId ? { workspaceId: access.workspaceId } : {}),
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
          ...(coverLetter
            ? { coverLetterAttachment: { create: applicationCoverLetterCreateData(applicationData.jobTitle, applicationData.company, coverLetter) } }
            : {}),
        },
        include: applicationInclude,
      });
    });
  },

  async findById(userId: string, id: string, workspaceId?: string) {
    const access = await applicationAccess(userId, workspaceId);
    return prisma.application.findFirst({
      where: { ...access.where, id },
      include: applicationInclude,
    });
  },

  async update(
    userId: string,
    id: string,
    data: UpdateApplicationInput,
    resume?: ApplicationResumeAttachmentInput,
    workspaceId?: string,
    coverLetter?: ApplicationCoverLetterAttachmentInput,
  ) {
    const access = await applicationAccess(userId, workspaceId, true);
    const result = await prisma.$transaction(async (transaction) => {
      const { resumeUploadKey: _resumeUploadKey, coverLetterUploadKey: _coverLetterUploadKey, ...applicationData } = data;
      const existing = await transaction.application.findFirst({
        where: { ...access.where, id },
        include: { resumeAttachment: { select: { storageKey: true } }, coverLetterAttachment: { select: { storageKey: true } } },
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
          ...(coverLetter
            ? { coverLetterAttachment: { upsert: { create: applicationCoverLetterCreateData(applicationData.jobTitle ?? existing.jobTitle, applicationData.company ?? existing.company, coverLetter), update: applicationCoverLetterCreateData(applicationData.jobTitle ?? existing.jobTitle, applicationData.company ?? existing.company, coverLetter) } } }
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
      const previousCoverLetterStorageKey = existing.coverLetterAttachment?.storageKey;
      const nextCoverLetterStorageKey = coverLetter && "storageKey" in coverLetter ? coverLetter.storageKey : undefined;
      const coverLetterStorageKeyToDelete = coverLetter && previousCoverLetterStorageKey && previousCoverLetterStorageKey !== nextCoverLetterStorageKey ? previousCoverLetterStorageKey : undefined;
      for (const storageKey of [storageKeyToDelete, coverLetterStorageKeyToDelete]) {
        if (storageKey) await transaction.resumeObjectDeletion.upsert({ where: { storageKey }, create: { storageKey }, update: {} });
      }

      return { application, storageKeysToDelete: [storageKeyToDelete, coverLetterStorageKeyToDelete].filter((key): key is string => Boolean(key)) };
    });

    if (result === null || result === false) return result;
    await Promise.all(result.storageKeysToDelete.map((key) => applicationResumeStorageService.processQueuedDeletion(key)));
    return result.application;
  },

  async remove(userId: string, id: string, workspaceId?: string) {
    const access = await applicationAccess(userId, workspaceId, true);
    const result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.application.findFirst({
        where: { ...access.where, id },
        select: {
          id: true,
          resumeAttachment: { select: { storageKey: true } },
          coverLetterAttachment: { select: { storageKey: true } },
        },
      });
      if (!existing) return null;

      const storageKeys = [existing.resumeAttachment?.storageKey, existing.coverLetterAttachment?.storageKey].filter((key): key is string => Boolean(key));
      for (const storageKey of storageKeys) await transaction.resumeObjectDeletion.upsert({ where: { storageKey }, create: { storageKey }, update: {} });
      await transaction.application.delete({ where: { id } });
      return { storageKeys };
    });

    if (!result) return false;
    await Promise.all(result.storageKeys.map((key) => applicationResumeStorageService.processQueuedDeletion(key)));
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
  coverLetterAttachment: {
    select: { fileName: true, mimeType: true, size: true, createdAt: true },
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
