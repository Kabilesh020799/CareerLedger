import { beforeEach, describe, expect, it, vi } from "vitest";

const queueMock = vi.hoisted(() => ({
  upsertJobScheduler: vi.fn(),
  removeJobScheduler: vi.fn(),
}));
const prismaMock = vi.hoisted(() => ({
  gmailConnection: { findMany: vi.fn() },
}));

vi.mock("bullmq", () => ({ Queue: vi.fn(() => queueMock) }));
vi.mock("../config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../config/redis", () => ({ createRedisConnection: vi.fn(() => ({})) }));

import { gmailSyncQueueService } from "./gmail-sync-queue.service";
import { Queue } from "bullmq";

describe("gmailSyncQueueService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a repeatable user-scoped job", async () => {
    await gmailSyncQueueService.schedule("user-1", 30);

    expect(Queue).toHaveBeenCalledWith(
      "gmail-sync",
      expect.objectContaining({
        defaultJobOptions: expect.objectContaining({
          attempts: 5,
          backoff: { type: "exponential", delay: 30_000 },
        }),
      }),
    );
    expect(queueMock.upsertJobScheduler).toHaveBeenCalledWith(
      "gmail-sync:user-1",
      { every: 1_800_000 },
      { name: "synchronize-user-gmail", data: { userId: "user-1" } },
    );
  });

  it("restores enabled schedules after an API restart", async () => {
    prismaMock.gmailConnection.findMany.mockResolvedValue([
      { userId: "user-1", autoSyncIntervalMins: 60 },
    ]);

    await gmailSyncQueueService.reconcile();

    expect(queueMock.upsertJobScheduler).toHaveBeenCalledWith(
      "gmail-sync:user-1",
      { every: 3_600_000 },
      { name: "synchronize-user-gmail", data: { userId: "user-1" } },
    );
  });
});
