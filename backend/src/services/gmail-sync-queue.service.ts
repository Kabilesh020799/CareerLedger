import { Queue } from "bullmq";
import { createRedisConnection } from "../config/redis";
import { prisma } from "../config/prisma";

export const gmailSyncQueueName = "gmail-sync";
export const gmailSyncJobName = "synchronize-user-gmail";

export type GmailSyncJobTrigger = "automatic" | "manual";
export type GmailSyncJobData = { userId: string; trigger: GmailSyncJobTrigger };

export type GmailSyncResult = {
  synchronizationType: "full" | "incremental";
  fetchedMessages: number;
  newMessages: number;
  duplicateMessages: number;
  analyzedMessages: number;
  detectedUpdates: number;
  lastSyncedAt: string;
};

export type GmailSyncJobStatus =
  | { jobId: string; status: "queued" | "running" }
  | { jobId: string; status: "completed"; result: GmailSyncResult }
  | { jobId: string; status: "failed"; error: string };

export class GmailSyncJobNotFoundError extends Error {}

let queue: Queue<GmailSyncJobData, GmailSyncResult | undefined> | undefined;

function getQueue() {
  queue ??= new Queue<GmailSyncJobData, GmailSyncResult | undefined>(gmailSyncQueueName, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 30_000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  });
  return queue;
}

function schedulerId(userId: string) {
  return `gmail-sync:${userId}`;
}

function manualJobId(userId: string) {
  return `gmail-manual-${userId}`;
}

export const gmailSyncQueueService = {
  async schedule(userId: string, intervalMinutes: number) {
    await getQueue().upsertJobScheduler(
      schedulerId(userId),
      { every: intervalMinutes * 60_000 },
      { name: gmailSyncJobName, data: { userId, trigger: "automatic" } },
    );
  },

  /** Enqueues at most one active manual synchronization per user. */
  async enqueueManual(userId: string) {
    const gmailQueue = getQueue();
    const jobId = manualJobId(userId);
    const existing = await gmailQueue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (["completed", "failed"].includes(state)) {
        await existing.remove();
      } else {
        return {
          jobId,
          status: state === "active" ? "running" as const : "queued" as const,
        };
      }
    }

    await gmailQueue.add(
      gmailSyncJobName,
      { userId, trigger: "manual" },
      { jobId },
    );
    return { jobId, status: "queued" as const };
  },

  /** Returns public status only when the queued job belongs to the requesting user. */
  async manualStatus(userId: string, jobId: string): Promise<GmailSyncJobStatus> {
    const job = await getQueue().getJob(jobId);
    if (!job || job.data.userId !== userId || job.data.trigger !== "manual") {
      throw new GmailSyncJobNotFoundError("Gmail synchronization job was not found");
    }

    const state = await job.getState();
    if (state === "completed") {
      if (job.returnvalue) {
        return { jobId, status: "completed", result: job.returnvalue };
      }
      return {
        jobId,
        status: "failed",
        error: "Gmail synchronization failed. Try again or reconnect Gmail.",
      };
    }
    if (state === "failed") {
      return {
        jobId,
        status: "failed",
        error: "Gmail synchronization failed. Try again or reconnect Gmail.",
      };
    }
    return { jobId, status: state === "active" ? "running" : "queued" };
  },

  async unschedule(userId: string) {
    await getQueue().removeJobScheduler(schedulerId(userId));
  },

  async reconcile() {
    const connections = await prisma.gmailConnection.findMany({
      where: { autoSyncEnabled: true },
      select: { userId: true, autoSyncIntervalMins: true },
    });
    await Promise.all(
      connections.map(({ userId, autoSyncIntervalMins }) =>
        this.schedule(userId, autoSyncIntervalMins),
      ),
    );
  },
};
