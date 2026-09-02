import { describe, expect, it, vi } from "vitest";

const queueMock = vi.hoisted(() => ({ upsertJobScheduler: vi.fn() }));
vi.mock("bullmq", () => ({
  Queue: vi.fn(function QueueMock() {
    return queueMock;
  }),
}));
vi.mock("../config/redis", () => ({ createRedisConnection: vi.fn(() => ({})) }));

import { Queue } from "bullmq";
import { notificationQueueService } from "./notification-queue.service";

describe("notificationQueueService", () => {
  it("schedules retryable due-reminder delivery every minute", async () => {
    await notificationQueueService.schedule();
    expect(Queue).toHaveBeenCalledWith("reminder-notifications", expect.objectContaining({ defaultJobOptions: expect.objectContaining({ attempts: 5 }) }));
    expect(queueMock.upsertJobScheduler).toHaveBeenCalledWith("due-reminder-delivery", { every: 60_000 }, { name: "deliver-due-reminders", data: {} });
  });
});
