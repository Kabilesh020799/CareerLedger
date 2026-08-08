import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  application: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));

import { applicationService } from "./application.service";

describe("application ownership", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists only records owned by the authenticated user", async () => {
    prismaMock.application.findMany.mockResolvedValue([]);

    await applicationService.list("user-1");

    expect(prismaMock.application.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("assigns a newly created application to the authenticated user", async () => {
    prismaMock.application.create.mockResolvedValue({ id: "application-1" });

    await applicationService.create("user-1", {
      company: "Acme",
      jobTitle: "Engineer",
    });

    expect(prismaMock.application.create).toHaveBeenCalledWith({
      data: {
        company: "Acme",
        jobTitle: "Engineer",
        userId: "user-1",
      },
    });
  });

  it("cannot read another user's application", async () => {
    prismaMock.application.findFirst.mockResolvedValue(null);

    await applicationService.findById("user-1", "application-2");

    expect(prismaMock.application.findFirst).toHaveBeenCalledWith({
      where: { id: "application-2", userId: "user-1" },
    });
  });

  it("cannot update another user's application", async () => {
    prismaMock.application.updateMany.mockResolvedValue({ count: 0 });

    const result = await applicationService.update("user-1", "application-2", {
      status: "INTERVIEW",
    });

    expect(result).toBeNull();
    expect(prismaMock.application.updateMany).toHaveBeenCalledWith({
      where: { id: "application-2", userId: "user-1" },
      data: { status: "INTERVIEW" },
    });
  });

  it("cannot delete another user's application", async () => {
    prismaMock.application.deleteMany.mockResolvedValue({ count: 0 });

    const result = await applicationService.remove("user-1", "application-2");

    expect(result).toBe(false);
    expect(prismaMock.application.deleteMany).toHaveBeenCalledWith({
      where: { id: "application-2", userId: "user-1" },
    });
  });
});
