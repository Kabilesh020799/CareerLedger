import { describe, expect, it } from "vitest";
import { captureJobPostingSchema } from "./browser-extension.validator";

const requiredPosting = {
  company: "Acme",
  jobTitle: "Engineer",
  jobUrl: "https://jobs.example/1",
  jobDescription: "Build useful software",
};

describe("captureJobPostingSchema", () => {
  it("accepts and normalizes reviewed structured posting details", () => {
    const result = captureJobPostingSchema.parse({
      ...requiredPosting,
      skills: ["TypeScript", "PostgreSQL"],
      salaryMin: 90_000,
      salaryMax: 120_000,
      salaryCurrency: "cad",
      salaryPeriod: "YEAR",
      workMode: "HYBRID",
    });
    expect(result.salaryCurrency).toBe("CAD");
    expect(result.skills).toEqual(["TypeScript", "PostgreSQL"]);
  });

  it("rejects an inverted salary range", () => {
    const result = captureJobPostingSchema.safeParse({ ...requiredPosting, salaryMin: 120_000, salaryMax: 90_000 });
    expect(result.success).toBe(false);
  });

  it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "ftp://jobs.example/1"])(
    "rejects unsafe job URL schemes: %s",
    (jobUrl) => {
      const result = captureJobPostingSchema.safeParse({ ...requiredPosting, jobUrl });
      expect(result.success).toBe(false);
    },
  );
});
