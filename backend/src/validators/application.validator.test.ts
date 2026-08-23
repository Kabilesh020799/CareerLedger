import { describe, expect, it } from "vitest";
import { createApplicationSchema } from "./application.validator";

const requiredApplication = {
  company: "Acme",
  jobTitle: "Engineer",
};

describe("createApplicationSchema job URLs", () => {
  it.each(["http://jobs.example/1", "https://jobs.example/1"])(
    "accepts %s",
    (jobUrl) => {
      const result = createApplicationSchema.safeParse({ ...requiredApplication, jobUrl });
      expect(result.success).toBe(true);
    },
  );

  it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "ftp://jobs.example/1"])(
    "rejects unsafe job URL schemes: %s",
    (jobUrl) => {
      const result = createApplicationSchema.safeParse({ ...requiredApplication, jobUrl });
      expect(result.success).toBe(false);
    },
  );
});
