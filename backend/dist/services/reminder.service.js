"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminderService = void 0;
const prisma_1 = require("../config/prisma");
exports.reminderService = {
    async listForApplication(userId, applicationId) {
        const application = await prisma_1.prisma.application.findFirst({
            where: { id: applicationId, userId },
            select: {
                reminders: {
                    orderBy: [
                        { completedAt: { sort: "asc", nulls: "first" } },
                        { dueAt: "asc" },
                    ],
                },
            },
        });
        return application?.reminders ?? null;
    },
    listOpen(userId) {
        return prisma_1.prisma.applicationReminder.findMany({
            where: {
                completedAt: null,
                application: { userId },
            },
            include: {
                application: {
                    select: { id: true, company: true, jobTitle: true },
                },
            },
            orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
            take: 50,
        });
    },
    create(userId, applicationId, data) {
        return prisma_1.prisma.$transaction(async (transaction) => {
            const application = await transaction.application.findFirst({
                where: { id: applicationId, userId },
                select: { id: true },
            });
            if (!application)
                return null;
            return transaction.applicationReminder.create({
                data: { ...data, applicationId },
            });
        });
    },
    updateCompletion(userId, id, completed) {
        return prisma_1.prisma.$transaction(async (transaction) => {
            const reminder = await transaction.applicationReminder.findFirst({
                where: { id, application: { userId } },
                select: { id: true },
            });
            if (!reminder)
                return null;
            return transaction.applicationReminder.update({
                where: { id },
                data: { completedAt: completed ? new Date() : null },
            });
        });
    },
    async remove(userId, id) {
        const result = await prisma_1.prisma.applicationReminder.deleteMany({
            where: { id, application: { userId } },
        });
        return result.count > 0;
    },
};
