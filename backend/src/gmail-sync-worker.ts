import { Worker } from "bullmq";
import { createRedisConnection } from "./config/redis";
import { prisma } from "./config/prisma";
import { processGmailSyncJob } from "./services/gmail-sync-job.service";
import {
  gmailSyncJobName,
  gmailSyncQueueName,
  type GmailSyncJobData,
  type GmailSyncResult,
} from "./services/gmail-sync-queue.service";
import { notificationJobName, notificationQueueName } from "./services/notification-queue.service";
import { notificationService } from "./services/notification.service";

const worker = new Worker<GmailSyncJobData, GmailSyncResult | undefined>(
  gmailSyncQueueName,
  async (job) => {
    if (job.name !== gmailSyncJobName) return;

    return processGmailSyncJob(job.data.userId, job.data.trigger ?? "automatic");
  },
  { connection: createRedisConnection(), concurrency: 2 },
);

const notificationWorker = new Worker(
  notificationQueueName,
  async (job) => {
    if (job.name === notificationJobName) await notificationService.deliverDueReminders();
  },
  { connection: createRedisConnection(), concurrency: 1 },
);

worker.on("failed", (job) => {
  console.error(`Gmail synchronization job ${job?.id ?? "unknown"} failed`);
});
notificationWorker.on("failed", (job) => {
  console.error(`Reminder notification job ${job?.id ?? "unknown"} failed`);
});

async function shutdown() {
  await worker.close();
  await notificationWorker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

console.log("Background workers running");
