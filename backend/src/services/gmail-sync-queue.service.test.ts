import { beforeEach, describe, expect, it, vi } from "vitest";

const queueMock = vi.hoisted(() => ({
  upsertJobScheduler: vi.fn(),
  removeJobScheduler: vi.fn(),
  add: vi.fn(),
  getJob: vi.fn(),
}));
const prismaMock = vi.hoisted(() => ({
  gmailConnection: { findMany: vi.fn() },
}));

vi.mock("bullmq", () => ({
  Queue: vi.fn(function QueueMock() {
    return queueMock;
  }),
}));
vi.mock("../config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../config/redis", () => ({ createRedisConnection: vi.fn(() => ({})) }));

import { gmailSyncQueueService } from "./gmail-sync-queue.service";
import { Queue } from "bullmq";

describe("gmailSyncQueueService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queueMock.getJob.mockResolvedValue(undefined);
  });

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
      { name: "synchronize-user-gmail", data: { userId: "user-1", trigger: "automatic" } },
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
      { name: "synchronize-user-gmail", data: { userId: "user-1", trigger: "automatic" } },
    );
  });

  it("queues one manual job and reuses it while active", async () => {
    await expect(gmailSyncQueueService.enqueueManual("user-1")).resolves.toEqual({
      jobId: "gmail-manual-user-1",
      status: "queued",
    });
    expect(queueMock.add).toHaveBeenCalledWith(
      "synchronize-user-gmail",
      { userId: "user-1", trigger: "manual" },
      { attempts: 1, jobId: "gmail-manual-user-1" },
    );

    queueMock.getJob.mockResolvedValue({ getState: vi.fn().mockResolvedValue("active") });
    await expect(gmailSyncQueueService.enqueueManual("user-1")).resolves.toEqual({
      jobId: "gmail-manual-user-1",
      status: "running",
    });
    expect(queueMock.add).toHaveBeenCalledTimes(1);
  });

  it("returns a completed result only for the job owner", async () => {
    const result = {
      synchronizationType: "incremental" as const,
      fetchedMessages: 2,
      newMessages: 1,
      duplicateMessages: 1,
      analyzedMessages: 2,
      detectedUpdates: 1,
      lastSyncedAt: "2026-08-17T12:00:00.000Z",
    };
    queueMock.getJob.mockResolvedValue({
      data: { userId: "user-1", trigger: "manual" },
      getState: vi.fn().mockResolvedValue("completed"),
      returnvalue: result,
    });

    await expect(
      gmailSyncQueueService.manualStatus("user-1", "gmail-manual-user-1"),
    ).resolves.toEqual({ jobId: "gmail-manual-user-1", status: "completed", result });
    await expect(
      gmailSyncQueueService.manualStatus("user-2", "gmail-manual-user-1"),
    ).rejects.toThrow("not found");
  });

  it("does not expose a failed job's provider error", async () => {
    queueMock.getJob.mockResolvedValue({
      data: { userId: "user-1", trigger: "manual" },
      getState: vi.fn().mockResolvedValue("failed"),
      failedReason: "secret provider response",
    });

    const status = await gmailSyncQueueService.manualStatus(
      "user-1",
      "gmail-manual-user-1",
    );
    expect(status).toEqual({
      jobId: "gmail-manual-user-1",
      status: "failed",
      error: "Gmail synchronization failed. Try again or reconnect Gmail.",
    });
    expect(JSON.stringify(status)).not.toContain("secret provider response");
  });
});
