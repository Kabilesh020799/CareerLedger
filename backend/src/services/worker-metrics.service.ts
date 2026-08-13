import { createServer, type Server } from "node:http";
import { Queue } from "bullmq";
import { metricsConfig } from "../config/metrics";
import { createRedisConnection } from "../config/redis";
import { gmailSyncQueueName } from "./gmail-sync-queue.service";
import { metricsService } from "./metrics.service";
import { notificationQueueName } from "./notification-queue.service";

const states = ["waiting", "active", "delayed", "failed"] as const;
let server: Server | undefined;
let interval: NodeJS.Timeout | undefined;
let queues: Queue[] = [];

async function collectQueueDepth() {
  for (const queue of queues) {
    const counts = await queue.getJobCounts(...states);
    states.forEach((state) => {
      metricsService.gauge("job_tracker_queue_jobs", counts[state] ?? 0, { queue: queue.name, state });
    });
  }
}

export const workerMetricsService = {
  start() {
    if (!metricsConfig.enabled || server) return;
    process.env.METRICS_PROCESS = "worker";
    queues = [gmailSyncQueueName, notificationQueueName].map(
      (name) => new Queue(name, { connection: createRedisConnection() }),
    );
    void collectQueueDepth().catch(() => undefined);
    interval = setInterval(() => void collectQueueDepth().catch(() => undefined), 15_000);
    interval.unref();
    server = createServer((req, res) => {
      const authorized = !metricsConfig.token || req.headers.authorization === `Bearer ${metricsConfig.token}`;
      if (req.url !== "/metrics") {
        res.writeHead(404).end();
      } else if (!authorized) {
        res.writeHead(401, { "content-type": "application/json" }).end('{"error":"Metrics authentication required"}');
      } else {
        res.writeHead(200, { "content-type": "text/plain; version=0.0.4; charset=utf-8" }).end(metricsService.render());
      }
    }).listen(metricsConfig.workerPort, "0.0.0.0");
  },

  async stop() {
    if (interval) clearInterval(interval);
    await Promise.all(queues.map((queue) => queue.close()));
    queues = [];
    await new Promise<void>((resolve, reject) => server?.close((error) => error ? reject(error) : resolve()) ?? resolve());
    server = undefined;
  },
};
