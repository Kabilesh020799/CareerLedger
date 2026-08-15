import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { count: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("../config/prisma", () => ({ prisma: prismaMock }));

import { adminService } from "./admin.service";

describe("adminService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((operations) => Promise.all(operations));
  });

  it("returns paginated non-sensitive user summaries and totals", async () => {
    prismaMock.user.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);
    prismaMock.user.findMany.mockResolvedValue([{
      id: "user-1",
      username: "person",
      email: "person@example.com",
      name: "Person",
      emailVerifiedAt: new Date("2026-08-01T00:00:00.000Z"),
      passwordHash: "private-hash",
      googleId: null,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      _count: { applications: 4, workspaceMemberships: 2 },
    }]);

    const result = await adminService.listUsers({ page: 2, pageSize: 25, search: "person" });

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 25,
      take: 25,
    }));
    expect(result.summary).toEqual({ totalUsers: 10, verifiedUsers: 7, passwordUsers: 8, googleUsers: 3 });
    expect(result.users[0]).toEqual(expect.objectContaining({
      email: "person@example.com",
      authMethods: { password: true, google: false },
      applicationCount: 4,
      workspaceCount: 2,
    }));
    expect(result.users[0]).not.toHaveProperty("passwordHash");
    expect(result.users[0]).not.toHaveProperty("googleId");
    expect(result.pagination).toEqual({ page: 2, pageSize: 25, totalItems: 1, totalPages: 1 });
  });
});
