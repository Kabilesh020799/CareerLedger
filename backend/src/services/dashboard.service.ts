import { prisma } from "../config/prisma";
import {
  ApplicationStatus,
  type ApplicationStatus as ApplicationStatusValue,
} from "../generated/prisma/enums";

const statuses = Object.values(ApplicationStatus);

export const dashboardService = {
  async getSummary(userId: string, now = new Date()) {
    const weekStartedAt = startOfUtcWeek(now);
    const [groupedStatuses, createdThisWeek] = await prisma.$transaction([
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
    };
  },
};

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
