import { describe, expect, it } from "vitest";
import { resolveGmailUpdateReviewSchema } from "./gmail-update-review.validator";

describe("resolveGmailUpdateReviewSchema", () => {
  it("accepts ignore, matched confirmation, and new-application decisions", () => {
    expect(
      resolveGmailUpdateReviewSchema.safeParse({ action: "IGNORE" }).success,
    ).toBe(true);
    expect(
      resolveGmailUpdateReviewSchema.safeParse({
        action: "CONFIRM",
        applicationId: "application-1",
        status: "INTERVIEW",
      }).success,
    ).toBe(true);
    expect(
      resolveGmailUpdateReviewSchema.safeParse({
        action: "CREATE_APPLICATION",
        company: "Acme",
        jobTitle: "Engineer",
        status: "APPLIED",
      }).success,
    ).toBe(true);
  });

  it("requires the fields for the selected decision and a supported status", () => {
    expect(
      resolveGmailUpdateReviewSchema.safeParse({
        action: "CONFIRM",
        status: "INTERVIEW",
      }).success,
    ).toBe(false);
    expect(
      resolveGmailUpdateReviewSchema.safeParse({
        action: "CREATE_APPLICATION",
        company: "",
        jobTitle: "Engineer",
        status: "UNKNOWN",
      }).success,
    ).toBe(false);
  });
});
