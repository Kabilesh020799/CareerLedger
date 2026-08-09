import { beforeEach, describe, expect, it, vi } from "vitest";

const transaction = {
  resumeVersion: { findFirst: vi.fn(), update: vi.fn() },
};

const prismaMock = vi.hoisted(() => ({
  resumeVersion: {
    findMany: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));

import { resumeVersionService } from "./resume-version.service";

describe("resumeVersionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) =>
      callback(transaction),
    );
  });

  it("lists only the current user's resume versions", async () => {
    prismaMock.resumeVersion.findMany.mockResolvedValue([]);

    await resumeVersionService.list("user-1");

    expect(prismaMock.resumeVersion.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    });
  });

  it("creates a user-owned resume version", async () => {
    prismaMock.resumeVersion.create.mockResolvedValue({ id: "resume-1" });

    await expect(
      resumeVersionService.create("user-1", {
        name: "Full-stack resume",
        notes: "TypeScript focus",
      }),
    ).resolves.toEqual({ kind: "success", data: { id: "resume-1" } });
    expect(prismaMock.resumeVersion.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        name: "Full-stack resume",
        notes: "TypeScript focus",
      },
    });
  });

  it("reports a duplicate resume name as a conflict", async () => {
    prismaMock.resumeVersion.create.mockRejectedValue({ code: "P2002" });

    await expect(
      resumeVersionService.create("user-1", { name: "Full-stack resume" }),
    ).resolves.toEqual({ kind: "conflict" });
  });

  it("updates only an owned resume version", async () => {
    transaction.resumeVersion.findFirst.mockResolvedValue({ id: "resume-1" });
    transaction.resumeVersion.update.mockResolvedValue({
      id: "resume-1",
      name: "Backend resume",
    });

    await expect(
      resumeVersionService.update("user-1", "resume-1", {
        name: "Backend resume",
      }),
    ).resolves.toEqual({
      kind: "success",
      data: { id: "resume-1", name: "Backend resume" },
    });
    expect(transaction.resumeVersion.findFirst).toHaveBeenCalledWith({
      where: { id: "resume-1", userId: "user-1" },
      select: { id: true },
    });
    expect(transaction.resumeVersion.update).toHaveBeenCalledWith({
      where: { id: "resume-1" },
      data: { name: "Backend resume" },
    });
  });

  it("does not update an inaccessible resume version", async () => {
    transaction.resumeVersion.findFirst.mockResolvedValue(null);

    await expect(
      resumeVersionService.update("user-1", "resume-2", { notes: null }),
    ).resolves.toEqual({ kind: "not_found" });
    expect(transaction.resumeVersion.update).not.toHaveBeenCalled();
  });

  it("deletes only an owned resume version", async () => {
    prismaMock.resumeVersion.deleteMany.mockResolvedValue({ count: 1 });

    await expect(
      resumeVersionService.remove("user-1", "resume-1"),
    ).resolves.toBe(true);
    expect(prismaMock.resumeVersion.deleteMany).toHaveBeenCalledWith({
      where: { id: "resume-1", userId: "user-1" },
    });
  });
});
