import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const transaction = {
  application: { findFirst: vi.fn() },
  applicationReminder: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

const prismaMock = vi.hoisted(() => ({
  application: { findFirst: vi.fn() },
  applicationReminder: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));

import { reminderService } from "./reminder.service";

describe("reminderService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) =>
      callback(transaction),
    );
  });

  afterEach(() => vi.useRealTimers());

  it("lists an owned application's reminders in open-first due-date order", async () => {
    const reminders = [{ id: "reminder-1" }];
    prismaMock.application.findFirst.mockResolvedValue({ reminders });

    await expect(
      reminderService.listForApplication("user-1", "application-1"),
    ).resolves.toEqual(reminders);
    expect(prismaMock.application.findFirst).toHaveBeenCalledWith({
      where: { id: "application-1", userId: "user-1" },
      select: {
        reminders: {
          orderBy: [
            { completedAt: { sort: "asc", nulls: "first" } },
            { dueAt: "asc" },
          ],
        },
      },
    });
  });

  it("returns null when listing reminders for an inaccessible application", async () => {
    prismaMock.application.findFirst.mockResolvedValue(null);

    await expect(
      reminderService.listForApplication("user-1", "other-application"),
    ).resolves.toBeNull();
  });

  it("lists only open reminders owned by the user", async () => {
    prismaMock.applicationReminder.findMany.mockResolvedValue([]);

    await reminderService.listOpen("user-1");

    expect(prismaMock.applicationReminder.findMany).toHaveBeenCalledWith({
      where: {
        completedAt: null,
        application: { userId: "user-1" },
      },
      include: {
        application: {
          select: { id: true, company: true, jobTitle: true },
        },
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      take: 50,
    });
  });

  it("creates a reminder only after confirming application ownership", async () => {
    const dueAt = new Date("2026-08-15T14:00:00.000Z");
    const reminder = { id: "reminder-1" };
    transaction.application.findFirst.mockResolvedValue({ id: "application-1" });
    transaction.applicationReminder.create.mockResolvedValue(reminder);

    await expect(
      reminderService.create("user-1", "application-1", {
        type: "FOLLOW_UP",
        description: "Contact recruiter",
        dueAt,
      }),
    ).resolves.toEqual(reminder);
    expect(transaction.application.findFirst).toHaveBeenCalledWith({
      where: { id: "application-1", userId: "user-1" },
      select: { id: true },
    });
    expect(transaction.applicationReminder.create).toHaveBeenCalledWith({
      data: {
        applicationId: "application-1",
        type: "FOLLOW_UP",
        description: "Contact recruiter",
        dueAt,
      },
    });
  });

  it("does not create a reminder for an inaccessible application", async () => {
    transaction.application.findFirst.mockResolvedValue(null);

    await expect(
      reminderService.create("user-1", "application-2", {
        type: "DEADLINE",
        description: "Assessment deadline",
        dueAt: new Date("2026-08-15T14:00:00.000Z"),
      }),
    ).resolves.toBeNull();
    expect(transaction.applicationReminder.create).not.toHaveBeenCalled();
  });

  it("completes and reopens only an owned reminder", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T15:00:00.000Z"));
    transaction.applicationReminder.findFirst.mockResolvedValue({ id: "reminder-1" });
    transaction.applicationReminder.update.mockResolvedValue({ id: "reminder-1" });

    await reminderService.updateCompletion("user-1", "reminder-1", true);
    await reminderService.updateCompletion("user-1", "reminder-1", false);

    expect(transaction.applicationReminder.findFirst).toHaveBeenCalledWith({
      where: { id: "reminder-1", application: { userId: "user-1" } },
      select: { id: true },
    });
    expect(transaction.applicationReminder.update).toHaveBeenNthCalledWith(1, {
      where: { id: "reminder-1" },
      data: { completedAt: new Date("2026-08-09T15:00:00.000Z") },
    });
    expect(transaction.applicationReminder.update).toHaveBeenNthCalledWith(2, {
      where: { id: "reminder-1" },
      data: { completedAt: null },
    });
  });

  it("deletes only a reminder related to the user", async () => {
    prismaMock.applicationReminder.deleteMany.mockResolvedValue({ count: 1 });

    await expect(reminderService.remove("user-1", "reminder-1")).resolves.toBe(true);
    expect(prismaMock.applicationReminder.deleteMany).toHaveBeenCalledWith({
      where: { id: "reminder-1", application: { userId: "user-1" } },
    });
  });
});
