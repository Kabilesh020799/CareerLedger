import { describe, expect, it } from "vitest";
import {
  createResumeVersionSchema,
  updateResumeVersionSchema,
} from "./resume-version.validator";

describe("resume version validation", () => {
  it("trims a valid name and notes", () => {
    expect(
      createResumeVersionSchema.parse({
        name: "  Full-stack resume  ",
        notes: "  Focuses on TypeScript  ",
      }),
    ).toEqual({
      name: "Full-stack resume",
      notes: "Focuses on TypeScript",
    });
  });

  it.each([
    {},
    { name: "" },
    { name: "x".repeat(81) },
    { name: "Resume", notes: "" },
    { name: "Resume", unexpected: true },
  ])("rejects invalid create input: %j", (input) => {
    expect(createResumeVersionSchema.safeParse(input).success).toBe(false);
  });

  it("requires at least one update field", () => {
    expect(updateResumeVersionSchema.safeParse({}).success).toBe(false);
    expect(updateResumeVersionSchema.safeParse({ notes: null }).success).toBe(
      true,
    );
  });
});
