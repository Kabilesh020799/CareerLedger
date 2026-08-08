import { describe, expect, it } from "vitest";
import { createApplicationEventSchema } from "./application-event.validator";

describe("application event validation", () => {
  it("accepts a manual note and converts its occurrence date", () => {
    const result = createApplicationEventSchema.parse({
      type: "NOTE",
      description: " Followed up with the recruiter. ",
      occurredAt: "2026-08-07T15:30:00.000Z",
    });

    expect(result).toEqual({
      type: "NOTE",
      description: "Followed up with the recruiter.",
      occurredAt: new Date("2026-08-07T15:30:00.000Z"),
    });
  });

  it("rejects an empty note description", () => {
    const result = createApplicationEventSchema.safeParse({
      type: "NOTE",
      description: "   ",
      occurredAt: "2026-08-07T15:30:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("does not allow clients to create status-change events", () => {
    const result = createApplicationEventSchema.safeParse({
      type: "STATUS_CHANGE",
      description: "Changed status",
      occurredAt: "2026-08-07T15:30:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
