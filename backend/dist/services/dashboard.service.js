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
const responseOutcomeStatuses = new Set([
    enums_1.ApplicationStatus.SCREENING,
    enums_1.ApplicationStatus.ASSESSMENT,
    enums_1.ApplicationStatus.INTERVIEW,
    enums_1.ApplicationStatus.OFFER,
    enums_1.ApplicationStatus.REJECTED,
]);
exports.dashboardService = {
    async getSummary(userId, now = new Date()) {
        const weekStartedAt = startOfUtcWeek(now);
        const [groupedStatuses, createdThisWeek, resumeVersions, groupedSources] = await prisma_1.prisma.$transaction([
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
            prisma_1.prisma.application.groupBy({
                by: ["source", "status"],
                where: { userId, source: { not: null } },
                _count: { _all: true },
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
            sourceOutcomes: createSourceOutcomes(groupedSources),
        };
    },
};
function createSourceOutcomes(sourceGroups) {
    const groupedSources = new Map();
    for (const sourceGroup of sourceGroups) {
        const source = normalizeSourceLabel(sourceGroup.source);
        if (!source)
            continue;
        const key = source.toLocaleLowerCase("en-US");
        const group = groupedSources.get(key);
        if (group) {
            group.statusCounts.set(sourceGroup.status, (group.statusCounts.get(sourceGroup.status) ?? 0) +
                sourceGroup._count._all);
        }
        else {
            groupedSources.set(key, {
                source,
                statusCounts: new Map([
                    [sourceGroup.status, sourceGroup._count._all],
                ]),
            });
        }
    }
    return [...groupedSources.values()]
        .map(({ source, statusCounts }) => {
        const submittedApplications = sumStatusCounts(statusCounts, (status) => status !== enums_1.ApplicationStatus.SAVED);
        const responses = sumStatusCounts(statusCounts, (status) => responseOutcomeStatuses.has(status));
        const interviews = sumStatusCounts(statusCounts, (status) => interviewMilestoneStatuses.has(status));
        const offers = statusCounts.get(enums_1.ApplicationStatus.OFFER) ?? 0;
        return {
            source,
            submittedApplications,
            outcomeCounts: {
                response: responses,
                interview: interviews,
                offer: offers,
            },
            outcomeRates: {
                response: optionalPercentage(responses, submittedApplications),
                interview: optionalPercentage(interviews, submittedApplications),
                offer: optionalPercentage(offers, submittedApplications),
            },
        };
    })
        .sort((left, right) => right.submittedApplications - left.submittedApplications ||
        left.source.localeCompare(right.source, "en-US", {
            sensitivity: "base",
        }));
}
function sumStatusCounts(statusCounts, include) {
    let total = 0;
    for (const [status, count] of statusCounts) {
        if (include(status))
            total += count;
    }
    return total;
}
function normalizeSourceLabel(source) {
    const normalized = source?.trim().replace(/\s+/g, " ");
    return normalized || null;
}
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
