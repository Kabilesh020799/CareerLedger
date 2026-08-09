import { describe, expect, it } from "vitest";
import {
  createReminderSchema,
  updateReminderSchema,
} from "./reminder.validator";

describe("reminder validation", () => {
  it("parses a valid reminder and trims its description", () => {
    expect(
      createReminderSchema.parse({
        type: "FOLLOW_UP",
        description: "  Contact the recruiter  ",
        dueAt: "2026-08-15T14:00:00.000Z",
      }),
    ).toEqual({
      type: "FOLLOW_UP",
      description: "Contact the recruiter",
      dueAt: new Date("2026-08-15T14:00:00.000Z"),
    });
  });

  it.each([
    { type: "UNKNOWN", description: "Follow up", dueAt: "2026-08-15T14:00:00.000Z" },
    { type: "DEADLINE", description: "   ", dueAt: "2026-08-15T14:00:00.000Z" },
    { type: "DEADLINE", description: "Assessment due", dueAt: "not-a-date" },
    { type: "DEADLINE", description: "Assessment due", dueAt: "2026-08-15T14:00" },
  ])("rejects invalid reminder data: %j", (input) => {
    expect(createReminderSchema.safeParse(input).success).toBe(false);
  });

  it("accepts only the completion flag when updating", () => {
    expect(updateReminderSchema.parse({ completed: true })).toEqual({
      completed: true,
    });
    expect(
      updateReminderSchema.safeParse({ completed: true, description: "change" })
        .success,
    ).toBe(false);
  });
});
