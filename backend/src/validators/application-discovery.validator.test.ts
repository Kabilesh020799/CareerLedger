import { describe, expect, it } from "vitest";
import { applicationDiscoverySchema } from "./application-discovery.validator";

describe("application discovery validation", () => {
  it("provides stable pagination and sorting defaults", () => {
    expect(applicationDiscoverySchema.parse({})).toEqual({
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
      limit: 20,
    });
  });

  it("coerces query-string pagination and dates", () => {
    expect(
      applicationDiscoverySchema.parse({
        page: "2",
        limit: "50",
        appliedFrom: "2026-07-01",
        appliedTo: "2026-07-31",
      }),
    ).toEqual({
      appliedFrom: new Date("2026-07-01T00:00:00.000Z"),
      appliedTo: new Date("2026-07-31T23:59:59.999Z"),
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 2,
      limit: 50,
    });
  });

  it.each([
    { page: "0" },
    { limit: "101" },
    { limit: "15" },
    { sortBy: "jobTitle" },
    { sortOrder: "sideways" },
    { status: "UNKNOWN" },
    { appliedFrom: "2026-02-31" },
    { appliedFrom: "2026-08-01", appliedTo: "2026-07-01" },
  ])("rejects invalid discovery parameters: %j", (query) => {
    expect(applicationDiscoverySchema.safeParse(query).success).toBe(false);
  });
});
