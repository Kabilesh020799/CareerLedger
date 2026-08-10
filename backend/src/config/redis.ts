import "dotenv/config";
import IORedis from "ioredis";

export const redisConfig = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
};

/** Creates a BullMQ-compatible Redis connection for one queue or worker. */
export function createRedisConnection() {
  return new IORedis(redisConfig.url, { maxRetriesPerRequest: null });
}
