import { prisma } from "../config/prisma";
import {
  ApplicationStatus,
  type ApplicationStatus as ApplicationStatusValue,
} from "../generated/prisma/enums";

const statuses = Object.values(ApplicationStatus);
const screeningMilestoneStatuses = new Set<ApplicationStatusValue>([
  ApplicationStatus.SCREENING,
  ApplicationStatus.ASSESSMENT,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
]);
const interviewMilestoneStatuses = new Set<ApplicationStatusValue>([
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
]);
const responseOutcomeStatuses = new Set<ApplicationStatusValue>([
  ApplicationStatus.SCREENING,
  ApplicationStatus.ASSESSMENT,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
  ApplicationStatus.REJECTED,
]);

export const dashboardService = {
  async getSummary(userId: string, now = new Date()) {
    const weekStartedAt = startOfUtcWeek(now);
    const [groupedStatuses, createdThisWeek, resumeVersions, groupedSources] =
      await prisma.$transaction([
        prisma.application.groupBy({
          by: ["status"],
          where: { userId },
          _count: { _all: true },
        }),
        prisma.application.count({
          where: {
            userId,
            createdAt: { gte: weekStartedAt },
          },
        }),
        prisma.resumeVersion.findMany({
          where: { userId },
          select: {
            id: true,
            name: true,
            applications: {
              where: {
                userId,
                status: { not: ApplicationStatus.SAVED },
              },
              select: { status: true },
            },
          },
          orderBy: [{ name: "asc" }, { id: "asc" }],
        }),
        prisma.application.groupBy({
          by: ["source", "status"],
          where: { userId, source: { not: null } },
          _count: { _all: true },
        }),
      ]);

    const statusCounts = createEmptyStatusCounts();
    for (const group of groupedStatuses) {
      statusCounts[group.status] = group._count._all;
    }

    const totalApplications = Object.values(statusCounts).reduce(
      (total, count) => total + count,
      0,
    );
    const submittedApplications = totalApplications - statusCounts.SAVED;
    const screeningMilestones =
      statusCounts.SCREENING +
      statusCounts.ASSESSMENT +
      statusCounts.INTERVIEW +
      statusCounts.OFFER;
    const interviewMilestones =
      statusCounts.INTERVIEW + statusCounts.OFFER;

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
      resumeOutcomes: resumeVersions.map((resumeVersion) =>
        createResumeOutcome(resumeVersion),
      ),
      sourceOutcomes: createSourceOutcomes(groupedSources),
    };
  },
};

function createSourceOutcomes(
  sourceGroups: Array<{
    source: string | null;
    status: ApplicationStatusValue;
    _count: { _all: number };
  }>,
) {
  const groupedSources = new Map<
    string,
    {
      source: string;
      statusCounts: Map<ApplicationStatusValue, number>;
    }
  >();

  for (const sourceGroup of sourceGroups) {
    const source = normalizeSourceLabel(sourceGroup.source);
    if (!source) continue;

    const key = source.toLocaleLowerCase("en-US");
    const group = groupedSources.get(key);
    if (group) {
      group.statusCounts.set(
        sourceGroup.status,
        (group.statusCounts.get(sourceGroup.status) ?? 0) +
          sourceGroup._count._all,
      );
    } else {
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
      const submittedApplications = sumStatusCounts(
        statusCounts,
        (status) => status !== ApplicationStatus.SAVED,
      );
      const responses = sumStatusCounts(statusCounts, (status) =>
        responseOutcomeStatuses.has(status),
      );
      const interviews = sumStatusCounts(statusCounts, (status) =>
        interviewMilestoneStatuses.has(status),
      );
      const offers = statusCounts.get(ApplicationStatus.OFFER) ?? 0;

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
    .sort(
      (left, right) =>
        right.submittedApplications - left.submittedApplications ||
        left.source.localeCompare(right.source, "en-US", {
          sensitivity: "base",
        }),
    );
}

function sumStatusCounts(
  statusCounts: Map<ApplicationStatusValue, number>,
  include: (status: ApplicationStatusValue) => boolean,
) {
  let total = 0;
  for (const [status, count] of statusCounts) {
    if (include(status)) total += count;
  }
  return total;
}

function normalizeSourceLabel(source: string | null) {
  const normalized = source?.trim().replace(/\s+/g, " ");
  return normalized || null;
}

function createResumeOutcome(resumeVersion: {
  id: string;
  name: string;
  applications: Array<{ status: ApplicationStatusValue }>;
}) {
  const submittedApplications = resumeVersion.applications.length;
  const screeningMilestones = resumeVersion.applications.filter(({ status }) =>
    screeningMilestoneStatuses.has(status),
  ).length;
  const interviewMilestones = resumeVersion.applications.filter(({ status }) =>
    interviewMilestoneStatuses.has(status),
  ).length;
  const offers = resumeVersion.applications.filter(
    ({ status }) => status === ApplicationStatus.OFFER,
  ).length;

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

function createEmptyStatusCounts(): Record<ApplicationStatusValue, number> {
  return Object.fromEntries(statuses.map((status) => [status, 0])) as Record<
    ApplicationStatusValue,
    number
  >;
}

function startOfUtcWeek(date: Date) {
  const start = new Date(date);
  const daysSinceMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function percentage(count: number, total: number) {
  if (total === 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function optionalPercentage(count: number, total: number) {
  return total === 0 ? null : percentage(count, total);
}
