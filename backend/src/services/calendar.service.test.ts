import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  applicationReminder: { findMany: vi.fn(), findFirst: vi.fn() },
  applicationEvent: { findMany: vi.fn() },
  calendarFeedToken: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));

import { calendarService, serializeCalendar } from "./calendar.service";

describe("serializeCalendar", () => {
  it("escapes text, uses UTC dates and CRLF, and folds long UTF-8 lines", () => {
    const calendar = serializeCalendar([{
      uid: "event-1@example.test",
      summary: `Interview, platform; ${"é".repeat(50)}`,
      description: "First line\nSecond \\ line",
      location: "Halifax, NS",
      startsAt: new Date("2026-08-12T14:00:00.000Z"),
      endsAt: new Date("2026-08-12T15:00:00.000Z"),
      updatedAt: new Date("2026-08-11T12:00:00.000Z"),
    }]);

    expect(calendar).toContain("DTSTART:20260812T140000Z\r\n");
    expect(calendar).toContain("DTEND:20260812T150000Z\r\n");
    expect(calendar).toContain("DESCRIPTION:First line\\nSecond \\\\ line\r\n");
    expect(calendar).toContain("LOCATION:Halifax\\, NS\r\n");
    expect(calendar).toMatch(/SUMMARY:Interview\\, platform\\; .+\r\n /);
    expect(calendar.endsWith("END:VCALENDAR\r\n")).toBe(true);
    for (const line of calendar.split("\r\n")) {
      expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
    }
    expect(calendar.replace(/\r\n/g, "")).not.toContain("\n");
  });
});

describe("calendarService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.applicationReminder.findMany.mockResolvedValue([]);
    prismaMock.applicationEvent.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockResolvedValue([]);
  });

  it("exports only the user's open deadlines and interview milestones", async () => {
    prismaMock.applicationReminder.findMany.mockResolvedValue([{
      id: "reminder-1",
      description: "Submit take-home",
      dueAt: new Date("2026-08-14T13:00:00Z"),
      updatedAt: new Date("2026-08-12T10:00:00Z"),
      application: { company: "Acme", jobTitle: "Engineer", location: "Remote" },
    }]);
    prismaMock.applicationEvent.findMany.mockResolvedValue([{
      id: "event-1",
      description: "Status changed to INTERVIEW",
      occurredAt: new Date("2026-08-13T13:00:00Z"),
      createdAt: new Date("2026-08-12T11:00:00Z"),
      application: { company: "Beta", jobTitle: "Designer", location: null },
    }]);

    const calendar = await calendarService.exportForUser("user-1");

    expect(prismaMock.applicationReminder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { completedAt: null, type: "DEADLINE", application: { userId: "user-1" } },
    }));
    expect(prismaMock.applicationEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { toStatus: "INTERVIEW", application: { userId: "user-1" } },
    }));
    expect(calendar).toContain("SUMMARY:Interview: Beta — Designer");
    expect(calendar).toContain("DTEND:20260813T140000Z");
    expect(calendar).toContain("SUMMARY:Deadline: Acme — Engineer");
    expect(calendar).toContain("DTEND:20260814T131500Z");
    expect(calendar.indexOf("Interview: Beta")).toBeLessThan(calendar.indexOf("Deadline: Acme"));
  });

  it("does not reveal an inaccessible or completed reminder", async () => {
    prismaMock.applicationReminder.findFirst.mockResolvedValue(null);
    await expect(calendarService.exportReminder("user-1", "reminder-1")).resolves.toBeNull();
    expect(prismaMock.applicationReminder.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "reminder-1", completedAt: null, type: "DEADLINE", application: { userId: "user-1" } },
    }));
  });

  it("rotates active subscription tokens and returns the secret only in the URL", async () => {
    const result = await calendarService.rotateSubscription("user-1");

    expect(result.url).toMatch(/^http:\/\/localhost:3000\/api\/calendar\/feed\/[a-f0-9]{64}$/);
    const transactionCalls = prismaMock.$transaction.mock.calls[0][0];
    expect(transactionCalls).toHaveLength(2);
    expect(prismaMock.calendarFeedToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prismaMock.calendarFeedToken.create).toHaveBeenCalledWith({
      data: { userId: "user-1", tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) },
    });
    expect(result.url).not.toContain(prismaMock.calendarFeedToken.create.mock.calls[0][0].data.tokenHash);
  });

  it("returns no feed for an invalid or revoked bearer token", async () => {
    prismaMock.calendarFeedToken.findFirst.mockResolvedValue(null);
    await expect(calendarService.exportForToken("a".repeat(64))).resolves.toBeNull();
    expect(prismaMock.calendarFeedToken.findFirst).toHaveBeenCalledWith({
      where: { tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/), revokedAt: null },
      select: { userId: true },
    });
  });
});
