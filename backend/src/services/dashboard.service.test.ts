import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  application: {
    groupBy: vi.fn(),
    count: vi.fn(),
  },
  resumeVersion: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));

import { dashboardService } from "./dashboard.service";

describe("dashboardService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((operations) =>
      Promise.all(operations),
    );
  });

  it("returns user-scoped totals, Monday activity, and pipeline rates", async () => {
    prismaMock.application.groupBy.mockResolvedValue([
      { status: "SAVED", _count: { _all: 2 } },
      { status: "APPLIED", _count: { _all: 2 } },
      { status: "SCREENING", _count: { _all: 1 } },
      { status: "ASSESSMENT", _count: { _all: 1 } },
      { status: "INTERVIEW", _count: { _all: 1 } },
      { status: "OFFER", _count: { _all: 1 } },
      { status: "REJECTED", _count: { _all: 1 } },
    ]);
    prismaMock.application.count.mockResolvedValue(3);
    prismaMock.resumeVersion.findMany.mockResolvedValue([
      {
        id: "resume-2",
        name: "Backend resume",
        applications: [],
      },
      {
        id: "resume-1",
        name: "Full-stack resume",
        applications: [
          { status: "APPLIED" },
          { status: "SCREENING" },
          { status: "ASSESSMENT" },
          { status: "INTERVIEW" },
          { status: "OFFER" },
          { status: "REJECTED" },
          { status: "WITHDRAWN" },
        ],
      },
    ]);

    const result = await dashboardService.getSummary(
      "user-1",
      new Date("2026-08-09T18:00:00.000Z"),
    );

    expect(result).toEqual({
      totalApplications: 9,
      createdThisWeek: 3,
      weekStartedAt: "2026-08-03T00:00:00.000Z",
      submittedApplications: 7,
      statusCounts: {
        SAVED: 2,
        APPLIED: 2,
        SCREENING: 1,
        ASSESSMENT: 1,
        INTERVIEW: 1,
        OFFER: 1,
        REJECTED: 1,
        WITHDRAWN: 0,
      },
      conversionRates: {
        screening: 57.1,
        interview: 28.6,
        offer: 14.3,
      },
      resumeOutcomes: [
        {
          resumeVersionId: "resume-2",
          name: "Backend resume",
          submittedApplications: 0,
          milestoneCounts: { screening: 0, interview: 0, offer: 0 },
          conversionRates: { screening: null, interview: null, offer: null },
        },
        {
          resumeVersionId: "resume-1",
          name: "Full-stack resume",
          submittedApplications: 7,
          milestoneCounts: { screening: 4, interview: 2, offer: 1 },
          conversionRates: { screening: 57.1, interview: 28.6, offer: 14.3 },
        },
      ],
    });
    expect(prismaMock.application.groupBy).toHaveBeenCalledWith({
      by: ["status"],
      where: { userId: "user-1" },
      _count: { _all: true },
    });
    expect(prismaMock.application.count).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        createdAt: { gte: new Date("2026-08-03T00:00:00.000Z") },
      },
    });
    expect(prismaMock.resumeVersion.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: {
        id: true,
        name: true,
        applications: {
          where: { userId: "user-1", status: { not: "SAVED" } },
          select: { status: true },
        },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
  });

  it("returns complete zero metrics when no applications exist", async () => {
    prismaMock.application.groupBy.mockResolvedValue([]);
    prismaMock.application.count.mockResolvedValue(0);
    prismaMock.resumeVersion.findMany.mockResolvedValue([]);

    const result = await dashboardService.getSummary(
      "user-1",
      new Date("2026-08-03T00:00:00.000Z"),
    );

    expect(result.totalApplications).toBe(0);
    expect(result.submittedApplications).toBe(0);
    expect(Object.values(result.statusCounts)).toEqual(Array(8).fill(0));
    expect(result.conversionRates).toEqual({
      screening: 0,
      interview: 0,
      offer: 0,
    });
    expect(result.resumeOutcomes).toEqual([]);
  });

  it("returns zero rates when every application is only saved", async () => {
    prismaMock.application.groupBy.mockResolvedValue([
      { status: "SAVED", _count: { _all: 4 } },
    ]);
    prismaMock.application.count.mockResolvedValue(1);
    prismaMock.resumeVersion.findMany.mockResolvedValue([
      { id: "resume-1", name: "Saved resume", applications: [] },
    ]);

    const result = await dashboardService.getSummary("user-1");

    expect(result.totalApplications).toBe(4);
    expect(result.submittedApplications).toBe(0);
    expect(result.conversionRates).toEqual({
      screening: 0,
      interview: 0,
      offer: 0,
    });
    expect(result.resumeOutcomes[0]).toMatchObject({
      submittedApplications: 0,
      conversionRates: { screening: null, interview: null, offer: null },
    });
  });
});
