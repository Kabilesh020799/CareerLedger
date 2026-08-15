import { describe, expect, it } from "vitest";
import {
  defaultAdminAccountEmail,
  isUnprovisionedAdminAccount,
  parseAdminAccountEmails,
} from "./admin";

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

  it("reserves an administrator email only until it is provisioned", () => {
    expect(isUnprovisionedAdminAccount(defaultAdminAccountEmail, false)).toBe(true);
    expect(isUnprovisionedAdminAccount(defaultAdminAccountEmail, true)).toBe(false);
    expect(isUnprovisionedAdminAccount("user@example.com", false)).toBe(false);
  });
});
