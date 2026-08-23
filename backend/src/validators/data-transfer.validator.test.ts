import { describe, expect, it } from "vitest";
import { portableDataDocumentSchema } from "./data-transfer.validator";

const application = {
  company: "Acme",
  jobTitle: "Engineer",
  location: null,
  jobUrl: "https://jobs.example/1",
  source: null,
  status: "SAVED" as const,
  notes: null,
  jobDescription: null,
  skills: [],
  experienceRequirements: null,
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  salaryPeriod: null,
  workMode: null,
  capturedAt: null,
  appliedAt: null,
  createdAt: "2026-08-12T00:00:00.000Z",
  events: [],
  reminders: [],
};

const document = {
  schemaVersion: 1 as const,
  exportedAt: "2026-08-12T00:00:00.000Z",
  workspace: { name: "Team" },
  applications: [application],
};

describe("portableDataDocumentSchema job URLs", () => {
  it("accepts HTTP and HTTPS application URLs", () => {
    expect(portableDataDocumentSchema.safeParse(document).success).toBe(true);
    expect(portableDataDocumentSchema.safeParse({
      ...document,
      applications: [{ ...application, jobUrl: "http://jobs.example/1" }],
    }).success).toBe(true);
  });

  it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "ftp://jobs.example/1"])(
    "rejects unsafe job URL schemes: %s",
    (jobUrl) => {
      const result = portableDataDocumentSchema.safeParse({
        ...document,
        applications: [{ ...application, jobUrl }],
      });
      expect(result.success).toBe(false);
    },
  );
});
