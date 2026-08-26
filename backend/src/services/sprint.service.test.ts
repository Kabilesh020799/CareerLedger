import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceAccessError } from "./workspace-access.service";

const { prismaMock, transactionMock } = vi.hoisted(() => {
  const transaction = {
    sprint: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

import {
  SprintNotFoundError,
  SprintNotEndedError,
  SprintScheduleConflictError,
  sprintService,
} from "./sprint.service";

const date = new Date("2026-08-24T12:00:00.000Z");
const day = 24 * 60 * 60 * 1000;

function sprint(overrides: Partial<{
  id: string;
  userId: string;
  workspaceId: string | null;
  name: string;
  sequence: number;
  status: "ACTIVE" | "CLOSED" | "SCHEDULED";
  durationDays: number;
  startedAt: Date;
  scheduledStartAt: Date | null;
  endsAt: Date;
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
    durationDays: 14,
    startedAt: date,
    scheduledStartAt: null,
    endsAt: new Date(date.getTime() + 14 * day),
    closedAt: null,
    createdAt: date,
    updatedAt: date,
    ...overrides,
  };
}

describe("sprintService", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: date });
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) => callback(transactionMock));
  });

  afterEach(() => vi.useRealTimers());

  it("lists only the authenticated user's legacy sprint scope newest first", async () => {
    prismaMock.sprint.findMany.mockResolvedValue([sprint()]);

    const result = await sprintService.list("user-1");

    expect(prismaMock.sprint.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", workspaceId: null },
      orderBy: [{ sequence: "desc" }, { startedAt: "desc" }],
    });
    expect(result[0]).toMatchObject({
      id: "sprint-1",
      sequence: 1,
      durationDays: 14,
      endsAt: new Date(date.getTime() + 14 * day),
    });
  });

  it("rejects access to a workspace when the user is not a member", async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue(null);

    await expect(sprintService.list("user-1", "workspace-1")).rejects.toBeInstanceOf(
      WorkspaceAccessError,
    );
    expect(prismaMock.sprint.findMany).not.toHaveBeenCalled();
  });

  it("includes duration and end time in the current sprint response", async () => {
    prismaMock.sprint.findFirst.mockResolvedValue(
      sprint({
        durationDays: 21,
        endsAt: new Date(date.getTime() + 21 * day),
      }),
    );
    prismaMock.application.findMany.mockResolvedValue([]);

    const result = await sprintService.current("user-1");

    expect(result.sprint).toMatchObject({
      durationDays: 21,
      endsAt: new Date(date.getTime() + 21 * day),
    });
  });

  it("creates a future scheduled sprint after the active sprint without touching applications", async () => {
    const active = sprint({
      durationDays: 7,
      endsAt: new Date(date.getTime() + 7 * day),
    });
    const startsAt = new Date(date.getTime() + 8 * day);
    const created = sprint({
      id: "sprint-2",
      name: "Hiring push",
      sequence: 2,
      status: "SCHEDULED",
      durationDays: 21,
      startedAt: startsAt,
      scheduledStartAt: startsAt,
      endsAt: new Date(startsAt.getTime() + 21 * day),
    });
    prismaMock.workspaceMember.findUnique.mockResolvedValue({
      role: "MEMBER",
      workspace: { isPersonal: false },
    });
    transactionMock.sprint.findFirst
      .mockResolvedValueOnce(active)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(active);
    transactionMock.sprint.create.mockResolvedValue(created);

    const result = await sprintService.schedule(
      "user-1",
      { name: "Hiring push", durationDays: 21, startsAt },
      "workspace-1",
    );

    expect(transactionMock.sprint.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        workspaceId: "workspace-1",
        name: "Hiring push",
        sequence: 2,
        status: "SCHEDULED",
        durationDays: 21,
        startedAt: startsAt,
        scheduledStartAt: startsAt,
        endsAt: new Date(startsAt.getTime() + 21 * day),
      },
    });
    expect(transactionMock.application.count).not.toHaveBeenCalled();
    expect(transactionMock.$executeRaw).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      id: "sprint-2",
      status: "SCHEDULED",
      scheduledStartAt: startsAt,
      endsAt: new Date(startsAt.getTime() + 21 * day),
    });
  });

  it("rejects a scheduled sprint that is not in the future or overlaps a plan", async () => {
    await expect(
      sprintService.schedule("user-1", { startsAt: date }),
    ).rejects.toBeInstanceOf(SprintScheduleConflictError);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();

    const active = sprint({ endsAt: new Date(date.getTime() + 7 * day) });
    transactionMock.sprint.findFirst
      .mockResolvedValueOnce(active)
      .mockResolvedValueOnce(null);

    await expect(
      sprintService.schedule("user-1", {
        startsAt: new Date(date.getTime() + 6 * day),
      }),
    ).rejects.toMatchObject({
      name: "SprintScheduleConflictError",
      requiredStartAt: active.endsAt,
    });
    expect(transactionMock.sprint.create).not.toHaveBeenCalled();
  });

  it("edits a scheduled sprint without changing its sequence or applications", async () => {
    const active = sprint({
      endsAt: new Date(date.getTime() + 7 * day),
    });
    const target = sprint({
      id: "sprint-2",
      name: "Original plan",
      sequence: 2,
      status: "SCHEDULED",
      scheduledStartAt: new Date(date.getTime() + 8 * day),
      startedAt: new Date(date.getTime() + 8 * day),
      endsAt: new Date(date.getTime() + 22 * day),
    });
    const next = sprint({
      id: "sprint-3",
      name: "Later plan",
      sequence: 3,
      status: "SCHEDULED",
      scheduledStartAt: new Date(date.getTime() + 30 * day),
      startedAt: new Date(date.getTime() + 30 * day),
      endsAt: new Date(date.getTime() + 44 * day),
    });
    const startsAt = new Date(date.getTime() + 10 * day);
    const updated = sprint({
      ...target,
      name: "Updated plan",
      durationDays: 18,
      scheduledStartAt: startsAt,
      startedAt: startsAt,
      endsAt: new Date(startsAt.getTime() + 18 * day),
    });
    transactionMock.sprint.findFirst
      .mockResolvedValueOnce(target)
      .mockResolvedValueOnce(active);
    transactionMock.sprint.findMany.mockResolvedValue([target, next]);
    transactionMock.sprint.update.mockResolvedValue(updated);

    const result = await sprintService.updateScheduled(
      "user-1",
      "sprint-2",
      { name: "Updated plan", durationDays: 18, startsAt },
    );

    expect(transactionMock.sprint.update).toHaveBeenCalledWith({
      where: { id: "sprint-2" },
      data: {
        name: "Updated plan",
        durationDays: 18,
        startedAt: startsAt,
        scheduledStartAt: startsAt,
        endsAt: new Date(startsAt.getTime() + 18 * day),
      },
    });
    expect(transactionMock.application.count).not.toHaveBeenCalled();
    expect(transactionMock.$executeRaw).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      id: "sprint-2",
      sequence: 2,
      name: "Updated plan",
      durationDays: 18,
      scheduledStartAt: startsAt,
      endsAt: new Date(startsAt.getTime() + 18 * day),
    });
  });

  it("rejects an edit that overlaps the active or another scheduled sprint", async () => {
    const active = sprint({ endsAt: new Date(date.getTime() + 7 * day) });
    const target = sprint({
      id: "sprint-2",
      sequence: 2,
      status: "SCHEDULED",
      scheduledStartAt: new Date(date.getTime() + 8 * day),
      startedAt: new Date(date.getTime() + 8 * day),
      endsAt: new Date(date.getTime() + 22 * day),
    });
    const next = sprint({
      id: "sprint-3",
      sequence: 3,
      status: "SCHEDULED",
      scheduledStartAt: new Date(date.getTime() + 30 * day),
      startedAt: new Date(date.getTime() + 30 * day),
      endsAt: new Date(date.getTime() + 44 * day),
    });
    transactionMock.sprint.findFirst
      .mockResolvedValueOnce(target)
      .mockResolvedValueOnce(active);
    transactionMock.sprint.findMany.mockResolvedValue([target, next]);

    await expect(
      sprintService.updateScheduled(
        "user-1",
        "sprint-2",
        { startsAt: new Date(date.getTime() + 20 * day), durationDays: 14 },
      ),
    ).rejects.toMatchObject({
      name: "SprintScheduleConflictError",
      scheduledStartAt: new Date(date.getTime() + 20 * day),
    });
    expect(transactionMock.sprint.update).not.toHaveBeenCalled();
    expect(transactionMock.application.count).not.toHaveBeenCalled();
  });

  it("cancels only a scheduled sprint plan", async () => {
    const scheduled = sprint({
      id: "sprint-2",
      sequence: 2,
      status: "SCHEDULED",
      scheduledStartAt: new Date(date.getTime() + 8 * day),
      startedAt: new Date(date.getTime() + 8 * day),
      endsAt: new Date(date.getTime() + 22 * day),
    });
    transactionMock.sprint.findFirst.mockResolvedValue(scheduled);
    transactionMock.sprint.delete.mockResolvedValue(scheduled);

    await expect(sprintService.cancelScheduled("user-1", "sprint-2")).resolves.toBeUndefined();

    expect(transactionMock.sprint.delete).toHaveBeenCalledWith({
      where: { id: "sprint-2" },
    });
    expect(transactionMock.application.count).not.toHaveBeenCalled();
    expect(transactionMock.$executeRaw).not.toHaveBeenCalled();
  });

  it("does not edit or cancel a sprint outside the scheduled scope", async () => {
    transactionMock.sprint.findFirst.mockResolvedValue(null);

    await expect(
      sprintService.updateScheduled("user-1", "sprint-2", { name: "Updated" }),
    ).rejects.toBeInstanceOf(SprintNotFoundError);
    await expect(sprintService.cancelScheduled("user-1", "sprint-2")).rejects.toBeInstanceOf(
      SprintNotFoundError,
    );
    expect(transactionMock.sprint.update).not.toHaveBeenCalled();
    expect(transactionMock.sprint.delete).not.toHaveBeenCalled();
  });

  it("requires write access before scheduling in a selected workspace", async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue({
      role: "VIEWER",
      workspace: { isPersonal: false },
    });

    await expect(
      sprintService.schedule(
        "user-1",
        { startsAt: new Date(date.getTime() + 7 * day) },
        "workspace-1",
      ),
    ).rejects.toBeInstanceOf(WorkspaceAccessError);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("lists closed sprint groups newest first with all assigned applications", async () => {
    const newest = sprint({
      id: "sprint-2",
      sequence: 2,
      name: "Sprint 2",
      status: "CLOSED",
      closedAt: date,
    });
    const oldest = sprint({
      id: "sprint-1",
      sequence: 1,
      name: "Sprint 1",
      status: "CLOSED",
      closedAt: date,
    });
    prismaMock.workspaceMember.findUnique.mockResolvedValue({
      role: "MEMBER",
      workspace: { isPersonal: false },
    });
    prismaMock.sprint.findMany.mockResolvedValue([newest, oldest]);
    prismaMock.application.findMany
      .mockResolvedValueOnce([{ id: "application-2" }])
      .mockResolvedValueOnce([{ id: "application-1" }]);

    const result = await sprintService.archived("user-1", "workspace-1");

    expect(prismaMock.sprint.findMany).toHaveBeenCalledWith({
      where: { workspaceId: "workspace-1", status: "CLOSED" },
      orderBy: [{ sequence: "desc" }, { startedAt: "desc" }],
    });
    expect(prismaMock.application.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { workspaceId: "workspace-1", sprintId: "sprint-2" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
    expect(prismaMock.application.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { workspaceId: "workspace-1", sprintId: "sprint-1" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
    expect(result.map((group) => group.sprint.id)).toEqual(["sprint-2", "sprint-1"]);
    expect(result.map((group) => group.applications)).toEqual([
      [{ id: "application-2" }],
      [{ id: "application-1" }],
    ]);
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
        durationDays: 14,
        startedAt: date,
        endsAt: new Date(date.getTime() + 14 * day),
      }),
    });
    expect(transactionMock.$executeRaw).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      sprint: {
        id: "sprint-1",
        name: "Sprint 1",
        durationDays: 14,
        endsAt: new Date(date.getTime() + 14 * day),
      },
      previousSprint: null,
      carriedOverCount: 3,
      closedRejectedCount: 0,
    });
  });

  it("closes a sprint, retains rejected applications, and carries over the rest", async () => {
    const active = sprint({
      durationDays: 7,
      endsAt: new Date(date.getTime() - 1),
    });
    const closed = sprint({ status: "CLOSED", closedAt: date });
    const next = sprint({
      id: "sprint-2",
      name: "Next sprint",
      sequence: 2,
      status: "ACTIVE",
    });
    transactionMock.sprint.findFirst
      .mockReset()
      .mockResolvedValueOnce(active)
      .mockResolvedValueOnce(null);
    transactionMock.sprint.update.mockResolvedValue(closed);
    transactionMock.sprint.create.mockResolvedValue(next);
    transactionMock.application.count.mockResolvedValue(1);
    transactionMock.$executeRaw.mockResolvedValue(2);

    const result = await sprintService.start("user-1", { name: "Next sprint" });

    expect(transactionMock.sprint.update).toHaveBeenCalledWith({
      where: { id: "sprint-1" },
      data: expect.objectContaining({ status: "CLOSED" }),
    });
    expect(transactionMock.sprint.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        durationDays: 7,
        startedAt: date,
        endsAt: new Date(date.getTime() + 7 * day),
      }),
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

  it("uses an explicitly configured duration for a later sprint", async () => {
    const active = sprint({ endsAt: new Date(date.getTime() - 1) });
    transactionMock.sprint.findFirst
      .mockResolvedValueOnce(active)
      .mockResolvedValueOnce(null);
    transactionMock.sprint.update.mockResolvedValue(
      sprint({ status: "CLOSED", closedAt: date }),
    );
    transactionMock.sprint.create.mockResolvedValue(
      sprint({ id: "sprint-2", sequence: 2 }),
    );
    transactionMock.application.count.mockResolvedValue(0);
    transactionMock.$executeRaw.mockResolvedValue(0);

    await sprintService.start("user-1", { durationDays: 21 });

    expect(transactionMock.sprint.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        durationDays: 21,
        endsAt: new Date(date.getTime() + 21 * day),
      }),
    });
  });

  it("rejects an early next-sprint start without mutating sprint or applications", async () => {
    const active = sprint({ endsAt: new Date(date.getTime() + 1) });
    transactionMock.sprint.findFirst.mockResolvedValue(active);
    const start = sprintService.start("user-1", {});

    await expect(start).rejects.toEqual(
      expect.objectContaining({
        name: "SprintNotEndedError",
        endsAt: active.endsAt,
      }),
    );
    await expect(start).rejects.toBeInstanceOf(SprintNotEndedError);
    expect(transactionMock.sprint.update).not.toHaveBeenCalled();
    expect(transactionMock.sprint.create).not.toHaveBeenCalled();
    expect(transactionMock.application.count).not.toHaveBeenCalled();
    expect(transactionMock.$executeRaw).not.toHaveBeenCalled();
  });

  it("requires the next scheduled plan instead of creating an unscheduled sprint", async () => {
    const active = sprint({ endsAt: new Date(date.getTime() - 1) });
    const scheduled = sprint({
      id: "sprint-2",
      sequence: 2,
      status: "SCHEDULED",
      scheduledStartAt: new Date(date.getTime() + day),
      startedAt: new Date(date.getTime() + day),
      endsAt: new Date(date.getTime() + 15 * day),
    });
    transactionMock.sprint.findFirst
      .mockResolvedValueOnce(active)
      .mockResolvedValueOnce(scheduled);

    await expect(sprintService.start("user-1", {})).rejects.toMatchObject({
      name: "SprintScheduleConflictError",
      scheduledStartAt: scheduled.scheduledStartAt,
    });
    expect(transactionMock.sprint.update).not.toHaveBeenCalled();
    expect(transactionMock.sprint.create).not.toHaveBeenCalled();
    expect(transactionMock.$executeRaw).not.toHaveBeenCalled();
  });

  it("activates the next scheduled sprint when it is due and carries applications over", async () => {
    const active = sprint({ endsAt: new Date(date.getTime() - 1) });
    const scheduledStart = date;
    const scheduled = sprint({
      id: "sprint-2",
      sequence: 2,
      status: "SCHEDULED",
      durationDays: 21,
      startedAt: scheduledStart,
      scheduledStartAt: scheduledStart,
      endsAt: new Date(scheduledStart.getTime() + 21 * day),
    });
    const closed = sprint({ status: "CLOSED", closedAt: date });
    const activated = sprint({
      id: "sprint-2",
      sequence: 2,
      status: "ACTIVE",
      durationDays: 21,
      startedAt: date,
      scheduledStartAt: null,
      endsAt: new Date(date.getTime() + 21 * day),
    });
    transactionMock.sprint.findFirst
      .mockResolvedValueOnce(active)
      .mockResolvedValueOnce(scheduled)
      .mockResolvedValueOnce(scheduled);
    transactionMock.sprint.update
      .mockResolvedValueOnce(closed)
      .mockResolvedValueOnce(activated);
    transactionMock.application.count.mockResolvedValue(1);
    transactionMock.$executeRaw.mockResolvedValue(2);

    const result = await sprintService.start("user-1", {
      scheduledSprintId: "sprint-2",
    });

    expect(transactionMock.sprint.update).toHaveBeenNthCalledWith(2, {
      where: { id: "sprint-2" },
      data: {
        status: "ACTIVE",
        startedAt: date,
        scheduledStartAt: null,
        endsAt: new Date(date.getTime() + 21 * day),
        closedAt: null,
      },
    });
    expect(transactionMock.sprint.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      sprint: { id: "sprint-2", status: "ACTIVE" },
      previousSprint: { id: "sprint-1", status: "CLOSED" },
      carriedOverCount: 2,
      closedRejectedCount: 1,
    });
  });

  it("rejects scheduled activation before its start or when it is out of order", async () => {
    const futureScheduled = sprint({
      id: "sprint-2",
      sequence: 2,
      status: "SCHEDULED",
      scheduledStartAt: new Date(date.getTime() + day),
      startedAt: new Date(date.getTime() + day),
      endsAt: new Date(date.getTime() + 15 * day),
    });
    transactionMock.sprint.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(futureScheduled)
      .mockResolvedValueOnce(futureScheduled);

    await expect(
      sprintService.start("user-1", { scheduledSprintId: "sprint-2" }),
    ).rejects.toMatchObject({
      name: "SprintScheduleConflictError",
      scheduledStartAt: futureScheduled.scheduledStartAt,
    });
    expect(transactionMock.sprint.update).not.toHaveBeenCalled();
    expect(transactionMock.$executeRaw).not.toHaveBeenCalled();

    const firstScheduled = sprint({
      id: "sprint-1",
      sequence: 1,
      status: "SCHEDULED",
      scheduledStartAt: date,
      startedAt: date,
      endsAt: new Date(date.getTime() + 14 * day),
    });
    const secondScheduled = sprint({
      id: "sprint-2",
      sequence: 2,
      status: "SCHEDULED",
      scheduledStartAt: date,
      startedAt: date,
      endsAt: new Date(date.getTime() + 21 * day),
    });
    transactionMock.sprint.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(secondScheduled)
      .mockResolvedValueOnce(firstScheduled);

    await expect(
      sprintService.start("user-1", { scheduledSprintId: "sprint-2" }),
    ).rejects.toMatchObject({ name: "SprintScheduleConflictError" });
    expect(transactionMock.sprint.update).not.toHaveBeenCalled();
  });
});
