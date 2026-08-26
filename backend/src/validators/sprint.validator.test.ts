import { describe, expect, it } from "vitest";
import {
  scheduleSprintSchema,
  startSprintSchema,
  updateScheduledSprintSchema,
} from "./sprint.validator";

describe("startSprintSchema", () => {
  it("accepts an omitted or trimmed sprint name", () => {
    expect(startSprintSchema.parse({})).toEqual({});
    expect(startSprintSchema.parse({ name: "  Focus week  " })).toEqual({ name: "Focus week" });
    expect(startSprintSchema.parse({ durationDays: 21 })).toEqual({ durationDays: 21 });
    expect(startSprintSchema.parse({ name: " Focus ", durationDays: 7 })).toEqual({
      name: "Focus",
      durationDays: 7,
    });
  });

  it("rejects empty and oversized sprint names", () => {
    expect(startSprintSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(startSprintSchema.safeParse({ name: "x".repeat(101) }).success).toBe(false);
  });

  it("requires a whole-number duration from 1 through 90 days", () => {
    expect(startSprintSchema.safeParse({ durationDays: 0 }).success).toBe(false);
    expect(startSprintSchema.safeParse({ durationDays: 91 }).success).toBe(false);
    expect(startSprintSchema.safeParse({ durationDays: 7.5 }).success).toBe(false);
    expect(startSprintSchema.safeParse({ durationDays: "14" }).success).toBe(false);
  });

  it("accepts a scheduled sprint start as a Date and an optional activation ID", () => {
    const startsAt = "2026-09-01T12:00:00.000Z";

    expect(
      scheduleSprintSchema.parse({
        name: "  September push  ",
        durationDays: 21,
        startsAt,
      }),
    ).toEqual({
      name: "September push",
      durationDays: 21,
      startsAt: new Date(startsAt),
    });
    expect(startSprintSchema.parse({ scheduledSprintId: " sprint-2 " })).toEqual({
      scheduledSprintId: "sprint-2",
    });
  });

  it("requires an ISO date-time for scheduled sprint creation", () => {
    expect(scheduleSprintSchema.safeParse({}).success).toBe(false);
    expect(scheduleSprintSchema.safeParse({ startsAt: "2026-09-01" }).success).toBe(false);
    expect(
      scheduleSprintSchema.safeParse({ startsAt: "2026-09-01T12:00:00" }).success,
    ).toBe(false);
    expect(scheduleSprintSchema.safeParse({ startsAt: "not-a-date" }).success).toBe(false);
  });

  it("validates partial scheduled-sprint updates", () => {
    expect(updateScheduledSprintSchema.parse({ durationDays: 21 })).toEqual({
      durationDays: 21,
    });
    expect(
      updateScheduledSprintSchema.parse({ startsAt: "2026-09-01T12:00:00.000Z" }),
    ).toEqual({ startsAt: new Date("2026-09-01T12:00:00.000Z") });
    expect(updateScheduledSprintSchema.safeParse({}).success).toBe(false);
    expect(updateScheduledSprintSchema.safeParse({ durationDays: 0 }).success).toBe(false);
  });
});
