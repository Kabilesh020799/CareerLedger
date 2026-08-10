"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationService = void 0;
const prisma_1 = require("../config/prisma");
const application_resume_service_1 = require("./application-resume.service");
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
            if (data.resumeVersionId) {
                const resumeVersion = await transaction.resumeVersion.findFirst({
                    where: { id: data.resumeVersionId, userId },
                    select: { id: true },
                });
                if (!resumeVersion)
                    return null;
            }
            return transaction.application.create({
                data: {
                    ...data,
                    userId,
                    ...(resume
                        ? {
                            resumeAttachment: {
                                create: (0, application_resume_service_1.applicationResumeCreateData)(data.jobTitle, data.company, resume),
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
        return prisma_1.prisma.$transaction(async (transaction) => {
            const existing = await transaction.application.findFirst({
                where: { id, userId },
            });
            if (!existing)
                return null;
            if (data.resumeVersionId) {
                const resumeVersion = await transaction.resumeVersion.findFirst({
                    where: { id: data.resumeVersionId, userId },
                    select: { id: true },
                });
                if (!resumeVersion)
                    return false;
            }
            const application = await transaction.application.update({
                where: { id },
                data: {
                    ...data,
                    ...(resume
                        ? {
                            resumeAttachment: {
                                upsert: {
                                    create: (0, application_resume_service_1.applicationResumeCreateData)(data.jobTitle ?? existing.jobTitle, data.company ?? existing.company, resume),
                                    update: (0, application_resume_service_1.applicationResumeCreateData)(data.jobTitle ?? existing.jobTitle, data.company ?? existing.company, resume),
                                },
                            },
                        }
                        : {}),
                },
                include: applicationInclude,
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
    async remove(userId, id) {
        const result = await prisma_1.prisma.application.deleteMany({ where: { id, userId } });
        return result.count > 0;
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
