"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminderService = void 0;
const prisma_1 = require("../config/prisma");
const FOLLOW_UP_INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000;
const SUGGESTED_DUE_DELAY_MS = 24 * 60 * 60 * 1000;
function followUpSuggestionWhere(userId, inactiveBefore, applicationId) {
    return {
        ...(applicationId ? { id: applicationId } : {}),
        userId,
        status: "APPLIED",
        updatedAt: { lt: inactiveBefore },
        events: { none: { createdAt: { gte: inactiveBefore } } },
        reminders: { none: { type: "FOLLOW_UP" } },
    };
}
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
    async listFollowUpSuggestions(userId, now = new Date()) {
        const inactiveBefore = new Date(now.getTime() - FOLLOW_UP_INACTIVITY_MS);
        const applications = await prisma_1.prisma.application.findMany({
            where: followUpSuggestionWhere(userId, inactiveBefore),
            select: {
                id: true,
                company: true,
                jobTitle: true,
                updatedAt: true,
                events: {
                    orderBy: { createdAt: "desc" },
                    select: { createdAt: true },
                    take: 1,
                },
            },
            orderBy: { updatedAt: "asc" },
            take: 20,
        });
        return applications.map(({ events, ...application }) => ({
            application: {
                id: application.id,
                company: application.company,
                jobTitle: application.jobTitle,
            },
            lastActivityAt: events[0]?.createdAt && events[0].createdAt > application.updatedAt
                ? events[0].createdAt
                : application.updatedAt,
        }));
    },
    createSuggestedFollowUp(userId, applicationId, now = new Date()) {
        const inactiveBefore = new Date(now.getTime() - FOLLOW_UP_INACTIVITY_MS);
        return prisma_1.prisma.$transaction(async (transaction) => {
            const application = await transaction.application.findFirst({
                where: followUpSuggestionWhere(userId, inactiveBefore, applicationId),
                select: { id: true, company: true },
            });
            if (!application)
                return null;
            return transaction.applicationReminder.create({
                data: {
                    applicationId: application.id,
                    type: "FOLLOW_UP",
                    description: `Follow up with ${application.company}`,
                    dueAt: new Date(now.getTime() + SUGGESTED_DUE_DELAY_MS),
                },
            });
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
