import { describe, expect, it } from "vitest";
import { startSprintSchema } from "./sprint.validator";

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
});
