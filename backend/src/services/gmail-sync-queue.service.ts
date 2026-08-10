import { Queue } from "bullmq";
import { createRedisConnection } from "../config/redis";
import { prisma } from "../config/prisma";

export const gmailSyncQueueName = "gmail-sync";
export const gmailSyncJobName = "synchronize-user-gmail";

export type GmailSyncJobData = { userId: string };

let queue: Queue<GmailSyncJobData> | undefined;

function getQueue() {
  queue ??= new Queue<GmailSyncJobData>(gmailSyncQueueName, {
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

export const gmailSyncQueueService = {
  async schedule(userId: string, intervalMinutes: number) {
    await getQueue().upsertJobScheduler(
      schedulerId(userId),
      { every: intervalMinutes * 60_000 },
      { name: gmailSyncJobName, data: { userId } },
    );
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
