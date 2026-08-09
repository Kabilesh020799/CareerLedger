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
  application: { findFirst: vi.fn(), findMany: vi.fn() },
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

  it("suggests owned applied applications inactive for more than seven days", async () => {
    const now = new Date("2026-08-09T15:00:00.000Z");
    const updatedAt = new Date("2026-07-30T10:00:00.000Z");
    const eventAt = new Date("2026-07-31T10:00:00.000Z");
    prismaMock.application.findMany.mockResolvedValue([
      {
        id: "application-1",
        company: "Acme",
        jobTitle: "Engineer",
        updatedAt,
        events: [{ createdAt: eventAt }],
      },
    ]);

    await expect(
      reminderService.listFollowUpSuggestions("user-1", now),
    ).resolves.toEqual([
      {
        application: {
          id: "application-1",
          company: "Acme",
          jobTitle: "Engineer",
        },
        lastActivityAt: eventAt,
      },
    ]);
    expect(prismaMock.application.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        status: "APPLIED",
        updatedAt: { lt: new Date("2026-08-02T15:00:00.000Z") },
        events: {
          none: { createdAt: { gte: new Date("2026-08-02T15:00:00.000Z") } },
        },
        reminders: { none: { type: "FOLLOW_UP" } },
      },
      select: {
        id: true,
        company: true,
        jobTitle: true,
        updatedAt: true,
        events: {
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
          take: 1,
        },
      },
      orderBy: { updatedAt: "asc" },
      take: 20,
    });
  });

  it("creates a suggested follow-up due one day later when still eligible", async () => {
    const now = new Date("2026-08-09T15:00:00.000Z");
    transaction.application.findFirst.mockResolvedValue({
      id: "application-1",
      company: "Acme",
    });
    transaction.applicationReminder.create.mockResolvedValue({ id: "reminder-1" });

    await expect(
      reminderService.createSuggestedFollowUp(
        "user-1",
        "application-1",
        now,
      ),
    ).resolves.toEqual({ id: "reminder-1" });
    expect(transaction.application.findFirst).toHaveBeenCalledWith({
      where: {
        id: "application-1",
        userId: "user-1",
        status: "APPLIED",
        updatedAt: { lt: new Date("2026-08-02T15:00:00.000Z") },
        events: {
          none: { createdAt: { gte: new Date("2026-08-02T15:00:00.000Z") } },
        },
        reminders: { none: { type: "FOLLOW_UP" } },
      },
      select: { id: true, company: true },
    });
    expect(transaction.applicationReminder.create).toHaveBeenCalledWith({
      data: {
        applicationId: "application-1",
        type: "FOLLOW_UP",
        description: "Follow up with Acme",
        dueAt: new Date("2026-08-10T15:00:00.000Z"),
      },
    });
  });

  it("does not create a suggested follow-up when it is no longer eligible", async () => {
    transaction.application.findFirst.mockResolvedValue(null);

    await expect(
      reminderService.createSuggestedFollowUp(
        "user-1",
        "application-1",
        new Date("2026-08-09T15:00:00.000Z"),
      ),
    ).resolves.toBeNull();
    expect(transaction.applicationReminder.create).not.toHaveBeenCalled();
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
