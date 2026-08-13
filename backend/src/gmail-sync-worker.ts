import { Worker } from "bullmq";
import { createRedisConnection } from "./config/redis";
import { prisma } from "./config/prisma";
import { processGmailSyncJob } from "./services/gmail-sync-job.service";
import {
  gmailSyncJobName,
  gmailSyncQueueName,
  type GmailSyncJobData,
} from "./services/gmail-sync-queue.service";
import { notificationJobName, notificationQueueName } from "./services/notification-queue.service";
import { notificationService } from "./services/notification.service";
import { logger } from "./config/logger";
import { metricsService } from "./services/metrics.service";
import { workerMetricsService } from "./services/worker-metrics.service";

const worker = new Worker<GmailSyncJobData>(
  gmailSyncQueueName,
  async (job) => {
    if (job.name !== gmailSyncJobName) return;

    await processGmailSyncJob(job.data.userId);
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

worker.on("active", (job) => {
  logger.info({ worker: "gmail-sync", jobId: job.id, userId: job.data.userId, attempt: job.attemptsMade + 1 }, "background job started");
});
worker.on("completed", (job) => {
  metricsService.increment("job_tracker_background_jobs_total", { outcome: "completed", worker: "gmail-sync" });
  if (job.finishedOn && job.processedOn) metricsService.observe("job_tracker_background_job_duration_seconds", (job.finishedOn - job.processedOn) / 1000, { worker: "gmail-sync" });
  logger.info({ worker: "gmail-sync", jobId: job.id, userId: job.data.userId, attempt: job.attemptsMade + 1, durationMs: job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : undefined }, "background job completed");
});
worker.on("failed", (job, error) => {
  metricsService.increment("job_tracker_background_jobs_total", { outcome: "failed", worker: "gmail-sync" });
  logger.error({ err: error, worker: "gmail-sync", jobId: job?.id ?? "unknown", userId: job?.data.userId, attempt: (job?.attemptsMade ?? 0) + 1, durationMs: job?.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : undefined }, "background job failed");
});
notificationWorker.on("active", (job) => {
  logger.info({ worker: "reminder-notification", jobId: job.id, attempt: job.attemptsMade + 1 }, "background job started");
});
notificationWorker.on("completed", (job) => {
  metricsService.increment("job_tracker_background_jobs_total", { outcome: "completed", worker: "reminder-notification" });
  logger.info({ worker: "reminder-notification", jobId: job.id, attempt: job.attemptsMade + 1, durationMs: job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : undefined }, "background job completed");
});
notificationWorker.on("failed", (job, error) => {
  metricsService.increment("job_tracker_background_jobs_total", { outcome: "failed", worker: "reminder-notification" });
  logger.error({ err: error, worker: "reminder-notification", jobId: job?.id ?? "unknown", attempt: (job?.attemptsMade ?? 0) + 1, durationMs: job?.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : undefined }, "background job failed");
});

async function shutdown() {
  await worker.close();
  await notificationWorker.close();
  await workerMetricsService.stop();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

logger.info({ workers: ["gmail-sync", "reminder-notification"] }, "background workers running");
workerMetricsService.start();
