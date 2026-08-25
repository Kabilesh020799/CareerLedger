import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  workspaceMember: { findUnique: vi.fn() },
  application: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));
const transactionMock = vi.hoisted(() => ({
  workspaceMember: { findUnique: vi.fn() },
  sprint: { findFirst: vi.fn() },
  application: { findMany: vi.fn(), create: vi.fn() },
}));

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));

import { dataTransferService } from "./data-transfer.service";

const emptyDocument = {
  schemaVersion: 1 as const,
  exportedAt: "2026-08-12T00:00:00.000Z",
  workspace: { name: "Team" },
  applications: [],
};

describe("dataTransferService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) => callback(transactionMock));
  });

  it("exports legacy unassigned applications only for the personal workspace", async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue({
      role: "OWNER",
      workspace: { id: "personal-1", name: "Personal", isPersonal: true },
    });
    prismaMock.application.findMany.mockResolvedValue([]);

    const result = await dataTransferService.exportWorkspace(
      "user-1", "personal-1", new Date("2026-08-12T00:00:00.000Z"),
    );

    expect(prismaMock.application.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ workspaceId: "personal-1" }, { workspaceId: null, userId: "user-1" }] },
    }));
    expect(result).toEqual({ ...emptyDocument, workspace: { name: "Personal" } });
  });

  it("skips matching applications and creates new records atomically", async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue({
      role: "MEMBER",
      workspace: { id: "workspace-1", name: "Team", isPersonal: false },
    });
    transactionMock.workspaceMember.findUnique.mockResolvedValue({ role: "MEMBER" });
    transactionMock.application.findMany.mockResolvedValue([
      {
        company: "Acme",
        jobTitle: "Engineer",
        jobUrl: null,
        appliedAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    ]);
    transactionMock.application.create.mockResolvedValue({ id: "created" });
    const application = {
      company: "Acme", jobTitle: "Engineer", location: null, jobUrl: null, source: null,
      status: "APPLIED" as const, notes: null, jobDescription: null, skills: [],
      experienceRequirements: null, salaryMin: null, salaryMax: null,
      salaryCurrency: null, salaryPeriod: null, workMode: null, capturedAt: null,
      appliedAt: "2026-08-01T00:00:00.000Z", createdAt: "2026-08-01T00:00:00.000Z",
      events: [], reminders: [],
    };

    const result = await dataTransferService.importWorkspace("user-1", {
      workspaceId: "workspace-1",
      document: {
        ...emptyDocument,
        applications: [
          application,
          { ...application, company: "Beta" },
          { ...application, company: "Beta" },
        ],
      },
    });

    expect(result).toEqual({ created: 1, skipped: 2, total: 3 });
    expect(transactionMock.application.findMany).toHaveBeenCalledTimes(1);
    expect(transactionMock.application.create).toHaveBeenCalledTimes(1);
    expect(transactionMock.application.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ company: "Beta", userId: "user-1", workspaceId: "workspace-1" }),
    }));
  });

  it("deduplicates legacy records when importing into a personal workspace", async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue({
      role: "OWNER",
      workspace: { id: "personal-1", name: "Personal", isPersonal: true },
    });
    transactionMock.workspaceMember.findUnique.mockResolvedValue({ role: "OWNER" });
    transactionMock.application.findMany.mockResolvedValue([
      {
        company: "Acme",
        jobTitle: "Engineer",
        jobUrl: null,
        appliedAt: null,
      },
    ]);
    const application = {
      company: "Acme", jobTitle: "Engineer", location: null, jobUrl: null, source: null,
      status: "SAVED" as const, notes: null, jobDescription: null, skills: [],
      experienceRequirements: null, salaryMin: null, salaryMax: null,
      salaryCurrency: null, salaryPeriod: null, workMode: null, capturedAt: null,
      appliedAt: null, createdAt: "2026-08-01T00:00:00.000Z", events: [], reminders: [],
    };

    await dataTransferService.importWorkspace("user-1", {
      workspaceId: "personal-1", document: { ...emptyDocument, applications: [application] },
    });

    expect(transactionMock.application.findMany).toHaveBeenCalledWith({
      where: {
        AND: expect.arrayContaining([
          {
            OR: [
              { workspaceId: "personal-1" },
              { workspaceId: null, userId: "user-1" },
            ],
          },
          expect.objectContaining({ OR: expect.any(Array) }),
        ]),
      },
      select: {
        company: true,
        jobTitle: true,
        jobUrl: true,
        appliedAt: true,
      },
    });
    expect(transactionMock.application.create).not.toHaveBeenCalled();
  });

  it("does not permit viewers to import", async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue({
      role: "VIEWER",
      workspace: { id: "workspace-1", name: "Team", isPersonal: false },
    });

    await expect(dataTransferService.importWorkspace("user-1", {
      workspaceId: "workspace-1", document: emptyDocument,
    })).rejects.toThrow("Workspace write access is required");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
