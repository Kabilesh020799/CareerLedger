"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardService = void 0;
const prisma_1 = require("../config/prisma");
const enums_1 = require("../generated/prisma/enums");
const statuses = Object.values(enums_1.ApplicationStatus);
const screeningMilestoneStatuses = new Set([
    enums_1.ApplicationStatus.SCREENING,
    enums_1.ApplicationStatus.ASSESSMENT,
    enums_1.ApplicationStatus.INTERVIEW,
    enums_1.ApplicationStatus.OFFER,
]);
const interviewMilestoneStatuses = new Set([
    enums_1.ApplicationStatus.INTERVIEW,
    enums_1.ApplicationStatus.OFFER,
]);
exports.dashboardService = {
    async getSummary(userId, now = new Date()) {
        const weekStartedAt = startOfUtcWeek(now);
        const [groupedStatuses, createdThisWeek, resumeVersions] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.application.groupBy({
                by: ["status"],
                where: { userId },
                _count: { _all: true },
            }),
            prisma_1.prisma.application.count({
                where: {
                    userId,
                    createdAt: { gte: weekStartedAt },
                },
            }),
            prisma_1.prisma.resumeVersion.findMany({
                where: { userId },
                select: {
                    id: true,
                    name: true,
                    applications: {
                        where: {
                            userId,
                            status: { not: enums_1.ApplicationStatus.SAVED },
                        },
                        select: { status: true },
                    },
                },
                orderBy: [{ name: "asc" }, { id: "asc" }],
            }),
        ]);
        const statusCounts = createEmptyStatusCounts();
        for (const group of groupedStatuses) {
            statusCounts[group.status] = group._count._all;
        }
        const totalApplications = Object.values(statusCounts).reduce((total, count) => total + count, 0);
        const submittedApplications = totalApplications - statusCounts.SAVED;
        const screeningMilestones = statusCounts.SCREENING +
            statusCounts.ASSESSMENT +
            statusCounts.INTERVIEW +
            statusCounts.OFFER;
        const interviewMilestones = statusCounts.INTERVIEW + statusCounts.OFFER;
        return {
            totalApplications,
            createdThisWeek,
            weekStartedAt: weekStartedAt.toISOString(),
            submittedApplications,
            statusCounts,
            conversionRates: {
                screening: percentage(screeningMilestones, submittedApplications),
                interview: percentage(interviewMilestones, submittedApplications),
                offer: percentage(statusCounts.OFFER, submittedApplications),
            },
            resumeOutcomes: resumeVersions.map((resumeVersion) => createResumeOutcome(resumeVersion)),
        };
    },
};
function createResumeOutcome(resumeVersion) {
    const submittedApplications = resumeVersion.applications.length;
    const screeningMilestones = resumeVersion.applications.filter(({ status }) => screeningMilestoneStatuses.has(status)).length;
    const interviewMilestones = resumeVersion.applications.filter(({ status }) => interviewMilestoneStatuses.has(status)).length;
    const offers = resumeVersion.applications.filter(({ status }) => status === enums_1.ApplicationStatus.OFFER).length;
    return {
        resumeVersionId: resumeVersion.id,
        name: resumeVersion.name,
        submittedApplications,
        milestoneCounts: {
            screening: screeningMilestones,
            interview: interviewMilestones,
            offer: offers,
        },
        conversionRates: {
            screening: optionalPercentage(screeningMilestones, submittedApplications),
            interview: optionalPercentage(interviewMilestones, submittedApplications),
            offer: optionalPercentage(offers, submittedApplications),
        },
    };
}
function createEmptyStatusCounts() {
    return Object.fromEntries(statuses.map((status) => [status, 0]));
}
function startOfUtcWeek(date) {
    const start = new Date(date);
    const daysSinceMonday = (start.getUTCDay() + 6) % 7;
    start.setUTCDate(start.getUTCDate() - daysSinceMonday);
    start.setUTCHours(0, 0, 0, 0);
    return start;
}
function percentage(count, total) {
    if (total === 0)
        return 0;
    return Math.round((count / total) * 1000) / 10;
}
function optionalPercentage(count, total) {
    return total === 0 ? null : percentage(count, total);
}
