import { Worker } from "bullmq";
import { createRedisConnection } from "./config/redis";
import { prisma } from "./config/prisma";
import { processGmailSyncJob } from "./services/gmail-sync-job.service";
import {
  gmailSyncJobName,
  gmailSyncQueueName,
  type GmailSyncJobData,
} from "./services/gmail-sync-queue.service";

const worker = new Worker<GmailSyncJobData>(
  gmailSyncQueueName,
  async (job) => {
    if (job.name !== gmailSyncJobName) return;

    await processGmailSyncJob(job.data.userId);
  },
  { connection: createRedisConnection(), concurrency: 2 },
);

worker.on("failed", (job) => {
  console.error(`Gmail synchronization job ${job?.id ?? "unknown"} failed`);
});

async function shutdown() {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

console.log("Gmail synchronization worker running");
