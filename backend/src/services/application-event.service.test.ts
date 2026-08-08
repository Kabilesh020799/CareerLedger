import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, transactionMock } = vi.hoisted(() => {
  const transaction = {
    application: { findFirst: vi.fn() },
    applicationEvent: { create: vi.fn() },
  };

  return {
    transactionMock: transaction,
    prismaMock: {
      application: { findFirst: vi.fn() },
      $transaction: vi.fn(),
    },
  };
});

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));

import { applicationEventService } from "./application-event.service";

describe("application timeline ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) =>
      callback(transactionMock),
    );
  });

  it("lists owned events from newest to oldest", async () => {
    const events = [{ id: "event-2" }, { id: "event-1" }];
    prismaMock.application.findFirst.mockResolvedValue({ events });

    await expect(
      applicationEventService.list("user-1", "application-1"),
    ).resolves.toEqual(events);
    expect(prismaMock.application.findFirst).toHaveBeenCalledWith({
      where: { id: "application-1", userId: "user-1" },
      select: {
        events: {
          orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        },
      },
    });
  });

  it("does not expose another user's timeline", async () => {
    prismaMock.application.findFirst.mockResolvedValue(null);

    await expect(
      applicationEventService.list("user-1", "application-2"),
    ).resolves.toBeNull();
  });

  it("creates a manual note for an owned application", async () => {
    const occurredAt = new Date("2026-08-07T15:30:00.000Z");
    transactionMock.application.findFirst.mockResolvedValue({
      id: "application-1",
    });
    transactionMock.applicationEvent.create.mockResolvedValue({ id: "event-1" });

    await applicationEventService.create("user-1", "application-1", {
      type: "NOTE",
      description: "Followed up with the recruiter.",
      occurredAt,
    });

    expect(transactionMock.application.findFirst).toHaveBeenCalledWith({
      where: { id: "application-1", userId: "user-1" },
      select: { id: true },
    });
    expect(transactionMock.applicationEvent.create).toHaveBeenCalledWith({
      data: {
        applicationId: "application-1",
        type: "NOTE",
        description: "Followed up with the recruiter.",
        occurredAt,
      },
    });
  });

  it("does not add an event to another user's application", async () => {
    transactionMock.application.findFirst.mockResolvedValue(null);

    await expect(
      applicationEventService.create("user-1", "application-2", {
        type: "NOTE",
        description: "Private note",
        occurredAt: new Date("2026-08-07T15:30:00.000Z"),
      }),
    ).resolves.toBeNull();
    expect(transactionMock.applicationEvent.create).not.toHaveBeenCalled();
  });
});
