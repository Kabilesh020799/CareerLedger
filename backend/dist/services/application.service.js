"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationService = void 0;
const prisma_1 = require("../config/prisma");
const application_resume_service_1 = require("./application-resume.service");
const application_resume_storage_service_1 = require("./application-resume-storage.service");
exports.applicationService = {
    list(userId) {
        return prisma_1.prisma.application.findMany({
            where: { userId },
            include: applicationInclude,
            orderBy: { createdAt: "desc" },
        });
    },
    async search(userId, query) {
        const where = {
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
        const [total, data] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.application.count({ where }),
            prisma_1.prisma.application.findMany({
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
    create(userId, data, resume) {
        return prisma_1.prisma.$transaction(async (transaction) => {
            const { resumeUploadKey: _resumeUploadKey, ...applicationData } = data;
            if (applicationData.resumeVersionId) {
                const resumeVersion = await transaction.resumeVersion.findFirst({
                    where: { id: applicationData.resumeVersionId, userId },
                    select: { id: true },
                });
                if (!resumeVersion)
                    return null;
            }
            return transaction.application.create({
                data: {
                    ...applicationData,
                    userId,
                    ...(resume
                        ? {
                            resumeAttachment: {
                                create: (0, application_resume_service_1.applicationResumeCreateData)(applicationData.jobTitle, applicationData.company, resume),
                            },
                        }
                        : {}),
                },
                include: applicationInclude,
            });
        });
    },
    findById(userId, id) {
        return prisma_1.prisma.application.findFirst({
            where: { id, userId },
            include: applicationInclude,
        });
    },
    async update(userId, id, data, resume) {
        const result = await prisma_1.prisma.$transaction(async (transaction) => {
            const { resumeUploadKey: _resumeUploadKey, ...applicationData } = data;
            const existing = await transaction.application.findFirst({
                where: { id, userId },
                include: { resumeAttachment: { select: { storageKey: true } } },
            });
            if (!existing)
                return null;
            if (applicationData.resumeVersionId) {
                const resumeVersion = await transaction.resumeVersion.findFirst({
                    where: { id: applicationData.resumeVersionId, userId },
                    select: { id: true },
                });
                if (!resumeVersion)
                    return false;
            }
            const application = await transaction.application.update({
                where: { id },
                data: {
                    ...applicationData,
                    ...(resume
                        ? {
                            resumeAttachment: {
                                upsert: {
                                    create: (0, application_resume_service_1.applicationResumeCreateData)(applicationData.jobTitle ?? existing.jobTitle, applicationData.company ?? existing.company, resume),
                                    update: (0, application_resume_service_1.applicationResumeCreateData)(applicationData.jobTitle ?? existing.jobTitle, applicationData.company ?? existing.company, resume),
                                },
                            },
                        }
                        : {}),
                },
                include: applicationInclude,
            });
            if (applicationData.status &&
                applicationData.status !== existing.status) {
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
            const nextStorageKey = resume && "storageKey" in resume ? resume.storageKey : undefined;
            const storageKeyToDelete = resume && previousStorageKey && previousStorageKey !== nextStorageKey
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
        if (result === null || result === false)
            return result;
        if (result.storageKeyToDelete) {
            await application_resume_storage_service_1.applicationResumeStorageService.processQueuedDeletion(result.storageKeyToDelete);
        }
        return result.application;
    },
    async remove(userId, id) {
        const result = await prisma_1.prisma.$transaction(async (transaction) => {
            const existing = await transaction.application.findFirst({
                where: { id, userId },
                select: {
                    id: true,
                    resumeAttachment: { select: { storageKey: true } },
                },
            });
            if (!existing)
                return null;
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
        if (!result)
            return false;
        if (result.storageKey) {
            await application_resume_storage_service_1.applicationResumeStorageService.processQueuedDeletion(result.storageKey);
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
};
function applicationOrderBy(sortBy, sortOrder) {
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
