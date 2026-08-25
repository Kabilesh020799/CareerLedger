import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceAccessError } from "./workspace-access.service";

const { prismaMock, transactionMock } = vi.hoisted(() => {
  const transaction = {
    sprint: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    application: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $executeRaw: vi.fn(),
  };

  return {
    transactionMock: transaction,
    prismaMock: {
      workspaceMember: { findUnique: vi.fn() },
      sprint: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      application: { findMany: vi.fn() },
      $transaction: vi.fn(),
    },
  };
});

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));

import { sprintService } from "./sprint.service";

const date = new Date("2026-08-24T12:00:00.000Z");

function sprint(overrides: Partial<{
  id: string;
  userId: string;
  workspaceId: string | null;
  name: string;
  sequence: number;
  status: "ACTIVE" | "CLOSED";
  startedAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: "sprint-1",
    userId: "user-1",
    workspaceId: null,
    name: "Sprint 1",
    sequence: 1,
    status: "ACTIVE" as const,
    startedAt: date,
    closedAt: null,
    createdAt: date,
    updatedAt: date,
    ...overrides,
  };
}

describe("sprintService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) => callback(transactionMock));
  });

  it("lists only the authenticated user's legacy sprint scope newest first", async () => {
    prismaMock.sprint.findMany.mockResolvedValue([sprint()]);

    const result = await sprintService.list("user-1");

    expect(prismaMock.sprint.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", workspaceId: null },
      orderBy: [{ sequence: "desc" }, { startedAt: "desc" }],
    });
    expect(result[0]).toMatchObject({ id: "sprint-1", sequence: 1 });
  });

  it("rejects access to a workspace when the user is not a member", async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue(null);

    await expect(sprintService.list("user-1", "workspace-1")).rejects.toBeInstanceOf(
      WorkspaceAccessError,
    );
    expect(prismaMock.sprint.findMany).not.toHaveBeenCalled();
  });

  it("starts Sprint 1 and assigns unassigned applications atomically", async () => {
    const created = sprint();
    transactionMock.sprint.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    transactionMock.sprint.create.mockResolvedValue(created);
    transactionMock.$executeRaw.mockResolvedValue(3);

    const result = await sprintService.start("user-1", {});

    expect(transactionMock.sprint.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        workspaceId: null,
        name: "Sprint 1",
        sequence: 1,
        status: "ACTIVE",
      }),
    });
    expect(transactionMock.$executeRaw).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      sprint: { id: "sprint-1", name: "Sprint 1" },
      previousSprint: null,
      carriedOverCount: 3,
      closedRejectedCount: 0,
    });
  });

  it("closes a sprint, retains rejected applications, and carries over the rest", async () => {
    const active = sprint();
    const closed = sprint({ status: "CLOSED", closedAt: date });
    const next = sprint({
      id: "sprint-2",
      name: "Next sprint",
      sequence: 2,
      status: "ACTIVE",
    });
    transactionMock.sprint.findFirst.mockResolvedValue(active);
    transactionMock.sprint.update.mockResolvedValue(closed);
    transactionMock.sprint.create.mockResolvedValue(next);
    transactionMock.application.count.mockResolvedValue(1);
    transactionMock.$executeRaw.mockResolvedValue(2);

    const result = await sprintService.start("user-1", { name: "Next sprint" });

    expect(transactionMock.sprint.update).toHaveBeenCalledWith({
      where: { id: "sprint-1" },
      data: expect.objectContaining({ status: "CLOSED" }),
    });
    expect(transactionMock.application.count).toHaveBeenCalledWith({
      where: { userId: "user-1", sprintId: "sprint-1", status: "REJECTED" },
    });
    expect(transactionMock.$executeRaw).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      sprint: { id: "sprint-2", sequence: 2, status: "ACTIVE" },
      previousSprint: { id: "sprint-1", status: "CLOSED" },
      carriedOverCount: 2,
      closedRejectedCount: 1,
    });
  });
});
