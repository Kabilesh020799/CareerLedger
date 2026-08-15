import { describe, expect, it } from "vitest";
import { parseAdminAccountEmails } from "./admin";

describe("admin account configuration", () => {
  it("normalizes and deduplicates configured emails", () => {
    expect([...parseAdminAccountEmails(" Admin@Example.com,admin@example.com ")]).toEqual([
      "admin@example.com",
    ]);
  });

  it("defaults to no administrators", () => {
    expect(parseAdminAccountEmails(undefined).size).toBe(0);
  });
});
