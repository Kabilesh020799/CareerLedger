import { Queue } from "bullmq";
import { createRedisConnection } from "../config/redis";

export const notificationQueueName = "reminder-notifications";
export const notificationJobName = "deliver-due-reminders";
let queue: Queue | undefined;

function getQueue() {
  queue ??= new Queue(notificationQueueName, {
    connection: createRedisConnection(),
    defaultJobOptions: { attempts: 5, backoff: { type: "exponential", delay: 30_000 }, removeOnComplete: 100, removeOnFail: 200 },
  });
  return queue;
}

export const notificationQueueService = {
  schedule() {
    return getQueue().upsertJobScheduler("due-reminder-delivery", { every: 60_000 }, { name: notificationJobName, data: {} });
  },
};
