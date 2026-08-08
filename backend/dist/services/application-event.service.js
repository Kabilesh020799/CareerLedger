"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationEventService = void 0;
const prisma_1 = require("../config/prisma");
exports.applicationEventService = {
    async list(userId, applicationId) {
        const application = await prisma_1.prisma.application.findFirst({
            where: { id: applicationId, userId },
            select: {
                events: {
                    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
                },
            },
        });
        return application?.events ?? null;
    },
    create(userId, applicationId, data) {
        return prisma_1.prisma.$transaction(async (transaction) => {
            const application = await transaction.application.findFirst({
                where: { id: applicationId, userId },
                select: { id: true },
            });
            if (!application)
                return null;
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
