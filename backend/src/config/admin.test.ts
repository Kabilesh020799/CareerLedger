import { describe, expect, it } from "vitest";
import { defaultAdminAccountEmail, parseAdminAccountEmails } from "./admin";

describe("admin account configuration", () => {
  it("normalizes and deduplicates configured emails", () => {
    expect([...parseAdminAccountEmails(" Admin@Example.com,admin@example.com ")]).toEqual([
      "admin@example.com",
    ]);
  });

  it("defaults the first built-in demo user to administrator access", () => {
    expect([...parseAdminAccountEmails(undefined)]).toEqual([defaultAdminAccountEmail]);
    expect([...parseAdminAccountEmails("")]).toEqual([defaultAdminAccountEmail]);
  });
});
