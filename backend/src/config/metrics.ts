import "dotenv/config";

function positivePort(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : fallback;
}

export const metricsConfig = {
  enabled: process.env.METRICS_ENABLED !== "false",
  token: process.env.METRICS_TOKEN?.trim() ?? "",
  workerPort: positivePort(process.env.WORKER_METRICS_PORT, 9464),
};
