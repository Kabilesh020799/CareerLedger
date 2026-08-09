"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationService = void 0;
const prisma_1 = require("../config/prisma");
exports.applicationService = {
    list(userId) {
        return prisma_1.prisma.application.findMany({
            where: { userId },
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
    create(userId, data) {
        return prisma_1.prisma.application.create({ data: { ...data, userId } });
    },
    findById(userId, id) {
        return prisma_1.prisma.application.findFirst({ where: { id, userId } });
    },
    async update(userId, id, data) {
        return prisma_1.prisma.$transaction(async (transaction) => {
            const existing = await transaction.application.findFirst({
                where: { id, userId },
            });
            if (!existing)
                return null;
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
    async remove(userId, id) {
        const result = await prisma_1.prisma.application.deleteMany({ where: { id, userId } });
        return result.count > 0;
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
