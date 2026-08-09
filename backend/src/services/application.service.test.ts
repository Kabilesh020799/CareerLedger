import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, transactionMock } = vi.hoisted(() => {
  const transaction = {
    application: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    resumeVersion: {
      findFirst: vi.fn(),
    },
    applicationEvent: {
      create: vi.fn(),
    },
  };

  return {
    transactionMock: transaction,
    prismaMock: {
      application: {
        count: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));

import { applicationService } from "./application.service";

const applicationInclude = {
  resumeVersion: {
    select: { id: true, name: true, notes: true },
  },
};

describe("application ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) =>
      callback(transactionMock),
    );
  });

  it("lists only records owned by the authenticated user", async () => {
    prismaMock.application.findMany.mockResolvedValue([]);

    await applicationService.list("user-1");

    expect(prismaMock.application.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      include: applicationInclude,
      orderBy: { createdAt: "desc" },
    });
  });

  it("searches only owned applications with combined filters", async () => {
    const data = [{ id: "application-1" }];
    prismaMock.$transaction.mockResolvedValueOnce([1, data]);
    const appliedFrom = new Date("2026-07-01T00:00:00.000Z");
    const appliedTo = new Date("2026-07-31T00:00:00.000Z");

    const result = await applicationService.search("user-1", {
      search: "engineer",
      status: "INTERVIEW",
      source: "LinkedIn",
      appliedFrom,
      appliedTo,
      sortBy: "company",
      sortOrder: "asc",
      page: 2,
      limit: 20,
    });

    const where = {
      userId: "user-1",
      OR: [
        { company: { contains: "engineer", mode: "insensitive" } },
        { jobTitle: { contains: "engineer", mode: "insensitive" } },
        { location: { contains: "engineer", mode: "insensitive" } },
      ],
      status: "INTERVIEW",
      source: { equals: "LinkedIn", mode: "insensitive" },
      appliedAt: { gte: appliedFrom, lte: appliedTo },
    };
    expect(prismaMock.application.count).toHaveBeenCalledWith({ where });
    expect(prismaMock.application.findMany).toHaveBeenCalledWith({
      where,
      include: applicationInclude,
      orderBy: [{ company: "asc" }, { id: "asc" }],
      skip: 20,
      take: 20,
    });
    expect(result).toEqual({
      data,
      pagination: { page: 2, limit: 20, total: 1, pages: 1 },
    });
  });

  it("sorts nullable applied dates with missing dates last", async () => {
    prismaMock.$transaction.mockResolvedValueOnce([41, []]);

    const result = await applicationService.search("user-1", {
      sortBy: "appliedAt",
      sortOrder: "desc",
      page: 1,
      limit: 20,
    });

    expect(prismaMock.application.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      include: applicationInclude,
      orderBy: [
        { appliedAt: { sort: "desc", nulls: "last" } },
        { id: "asc" },
      ],
      skip: 0,
      take: 20,
    });
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 41,
      pages: 3,
    });
  });

  it("assigns a newly created application to the authenticated user", async () => {
    transactionMock.application.create.mockResolvedValue({ id: "application-1" });

    await applicationService.create("user-1", {
      company: "Acme",
      jobTitle: "Engineer",
    });

    expect(transactionMock.application.create).toHaveBeenCalledWith({
      data: {
        company: "Acme",
        jobTitle: "Engineer",
        userId: "user-1",
      },
      include: applicationInclude,
    });
  });

  it("associates only an owned resume version when creating", async () => {
    transactionMock.resumeVersion.findFirst.mockResolvedValue({ id: "resume-1" });
    transactionMock.application.create.mockResolvedValue({
      id: "application-1",
      resumeVersionId: "resume-1",
    });

    await applicationService.create("user-1", {
      company: "Acme",
      jobTitle: "Engineer",
      resumeVersionId: "resume-1",
    });

    expect(transactionMock.resumeVersion.findFirst).toHaveBeenCalledWith({
      where: { id: "resume-1", userId: "user-1" },
      select: { id: true },
    });
  });

  it("rejects an inaccessible resume version when creating", async () => {
    transactionMock.resumeVersion.findFirst.mockResolvedValue(null);

    await expect(
      applicationService.create("user-1", {
        company: "Acme",
        jobTitle: "Engineer",
        resumeVersionId: "resume-2",
      }),
    ).resolves.toBeNull();
    expect(transactionMock.application.create).not.toHaveBeenCalled();
  });

  it("cannot read another user's application", async () => {
    prismaMock.application.findFirst.mockResolvedValue(null);

    await applicationService.findById("user-1", "application-2");

    expect(prismaMock.application.findFirst).toHaveBeenCalledWith({
      where: { id: "application-2", userId: "user-1" },
      include: applicationInclude,
    });
  });

  it("cannot update another user's application", async () => {
    transactionMock.application.findFirst.mockResolvedValue(null);

    const result = await applicationService.update("user-1", "application-2", {
      status: "INTERVIEW",
    });

    expect(result).toBeNull();
    expect(transactionMock.application.findFirst).toHaveBeenCalledWith({
      where: { id: "application-2", userId: "user-1" },
    });
    expect(transactionMock.application.update).not.toHaveBeenCalled();
    expect(transactionMock.applicationEvent.create).not.toHaveBeenCalled();
  });

  it("updates a status and records its transition in the same transaction", async () => {
    transactionMock.application.findFirst.mockResolvedValue({
      id: "application-1",
      status: "APPLIED",
    });
    transactionMock.application.update.mockResolvedValue({
      id: "application-1",
      status: "INTERVIEW",
    });
    transactionMock.applicationEvent.create.mockResolvedValue({ id: "event-1" });

    const result = await applicationService.update("user-1", "application-1", {
      status: "INTERVIEW",
    });

    expect(result).toEqual({ id: "application-1", status: "INTERVIEW" });
    expect(transactionMock.application.update).toHaveBeenCalledWith({
      where: { id: "application-1" },
      data: { status: "INTERVIEW" },
      include: applicationInclude,
    });
    expect(transactionMock.applicationEvent.create).toHaveBeenCalledWith({
      data: {
        applicationId: "application-1",
        type: "STATUS_CHANGE",
        description: "Status changed from APPLIED to INTERVIEW",
        fromStatus: "APPLIED",
        toStatus: "INTERVIEW",
      },
    });
  });

  it("rejects an inaccessible resume version when updating", async () => {
    transactionMock.application.findFirst.mockResolvedValue({
      id: "application-1",
      status: "APPLIED",
    });
    transactionMock.resumeVersion.findFirst.mockResolvedValue(null);

    await expect(
      applicationService.update("user-1", "application-1", {
        resumeVersionId: "resume-2",
      }),
    ).resolves.toBe(false);
    expect(transactionMock.application.update).not.toHaveBeenCalled();
  });

  it("does not record a status event when the status is unchanged", async () => {
    transactionMock.application.findFirst.mockResolvedValue({
      id: "application-1",
      status: "INTERVIEW",
    });
    transactionMock.application.update.mockResolvedValue({
      id: "application-1",
      status: "INTERVIEW",
    });

    await applicationService.update("user-1", "application-1", {
      status: "INTERVIEW",
      notes: "Updated notes",
    });

    expect(transactionMock.applicationEvent.create).not.toHaveBeenCalled();
  });

  it("fails the transaction when the status event cannot be recorded", async () => {
    transactionMock.application.findFirst.mockResolvedValue({
      id: "application-1",
      status: "APPLIED",
    });
    transactionMock.application.update.mockResolvedValue({
      id: "application-1",
      status: "INTERVIEW",
    });
    transactionMock.applicationEvent.create.mockRejectedValue(
      new Error("Event write failed"),
    );

    await expect(
      applicationService.update("user-1", "application-1", {
        status: "INTERVIEW",
      }),
    ).rejects.toThrow("Event write failed");
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
  });

  it("cannot delete another user's application", async () => {
    prismaMock.application.deleteMany.mockResolvedValue({ count: 0 });

    const result = await applicationService.remove("user-1", "application-2");

    expect(result).toBe(false);
    expect(prismaMock.application.deleteMany).toHaveBeenCalledWith({
      where: { id: "application-2", userId: "user-1" },
    });
  });
});
