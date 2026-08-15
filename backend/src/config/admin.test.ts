import { describe, expect, it } from "vitest";
import {
  adminAccountEmails,
  isUnprovisionedAdminAccount,
  parseAdminAccountEmails,
} from "./admin";

describe("admin account configuration", () => {
  it("normalizes and deduplicates configured emails", () => {
    expect([...parseAdminAccountEmails(" Admin@Example.com,admin@example.com ")]).toEqual([
      "admin@example.com",
    ]);
  });

  it("defaults to a configured demo email and otherwise grants nobody access", () => {
    expect([...parseAdminAccountEmails(undefined, "demo@example.invalid")]).toEqual([
      "demo@example.invalid",
    ]);
    expect([...parseAdminAccountEmails("", "")]).toEqual([]);
  });

  it("reserves an administrator email only until it is provisioned", () => {
    adminAccountEmails.add("admin@example.invalid");
    expect(isUnprovisionedAdminAccount("admin@example.invalid", false)).toBe(true);
    expect(isUnprovisionedAdminAccount("admin@example.invalid", true)).toBe(false);
    expect(isUnprovisionedAdminAccount("user@example.com", false)).toBe(false);
    adminAccountEmails.delete("admin@example.invalid");
  });
});
