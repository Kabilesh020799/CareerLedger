import { describe, expect, it } from "vitest";
import { startSprintSchema } from "./sprint.validator";

describe("startSprintSchema", () => {
  it("accepts an omitted or trimmed sprint name", () => {
    expect(startSprintSchema.parse({})).toEqual({});
    expect(startSprintSchema.parse({ name: "  Focus week  " })).toEqual({ name: "Focus week" });
  });

  it("rejects empty and oversized sprint names", () => {
    expect(startSprintSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(startSprintSchema.safeParse({ name: "x".repeat(101) }).success).toBe(false);
  });
});
