import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, transactionMock } = vi.hoisted(() => {
  const transaction = {
    application: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    applicationEvent: {
      create: vi.fn(),
    },
  };

  return {
    transactionMock: transaction,
    prismaMock: {
      application: {
        findMany: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));

import { applicationService } from "./application.service";

describe("application ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) =>
      callback(transactionMock),
    );
  });

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
    transactionMock.application.findFirst.mockResolvedValue(null);

    const result = await applicationService.update("user-1", "application-2", {
      status: "INTERVIEW",
    });

    expect(result).toBeNull();
    expect(transactionMock.application.findFirst).toHaveBeenCalledWith({
      where: { id: "application-2", userId: "user-1" },
    });
    expect(transactionMock.application.update).not.toHaveBeenCalled();
    expect(transactionMock.applicationEvent.create).not.toHaveBeenCalled();
  });

  it("updates a status and records its transition in the same transaction", async () => {
    transactionMock.application.findFirst.mockResolvedValue({
      id: "application-1",
      status: "APPLIED",
    });
    transactionMock.application.update.mockResolvedValue({
      id: "application-1",
      status: "INTERVIEW",
    });
    transactionMock.applicationEvent.create.mockResolvedValue({ id: "event-1" });

    const result = await applicationService.update("user-1", "application-1", {
      status: "INTERVIEW",
    });

    expect(result).toEqual({ id: "application-1", status: "INTERVIEW" });
    expect(transactionMock.application.update).toHaveBeenCalledWith({
      where: { id: "application-1" },
      data: { status: "INTERVIEW" },
    });
    expect(transactionMock.applicationEvent.create).toHaveBeenCalledWith({
      data: {
        applicationId: "application-1",
        type: "STATUS_CHANGE",
        description: "Status changed from APPLIED to INTERVIEW",
        fromStatus: "APPLIED",
        toStatus: "INTERVIEW",
      },
    });
  });

  it("does not record a status event when the status is unchanged", async () => {
    transactionMock.application.findFirst.mockResolvedValue({
      id: "application-1",
      status: "INTERVIEW",
    });
    transactionMock.application.update.mockResolvedValue({
      id: "application-1",
      status: "INTERVIEW",
    });

    await applicationService.update("user-1", "application-1", {
      status: "INTERVIEW",
      notes: "Updated notes",
    });

    expect(transactionMock.applicationEvent.create).not.toHaveBeenCalled();
  });

  it("fails the transaction when the status event cannot be recorded", async () => {
    transactionMock.application.findFirst.mockResolvedValue({
      id: "application-1",
      status: "APPLIED",
    });
    transactionMock.application.update.mockResolvedValue({
      id: "application-1",
      status: "INTERVIEW",
    });
    transactionMock.applicationEvent.create.mockRejectedValue(
      new Error("Event write failed"),
    );

    await expect(
      applicationService.update("user-1", "application-1", {
        status: "INTERVIEW",
      }),
    ).rejects.toThrow("Event write failed");
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
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
