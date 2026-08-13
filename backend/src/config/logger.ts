import pino, { type Logger, type LoggerOptions } from "pino";

const environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
const logFormat = process.env.LOG_FORMAT ?? (environment === "production" ? "json" : "pretty");

/** Fields that must never be emitted even when nested application data is logged. */
export const sensitiveLogPaths = [
  "password", "*.password", "*.*.password",
  "token", "*.token", "*.*.token",
  "accessToken", "*.accessToken", "refreshToken", "*.refreshToken",
  "authorization", "*.authorization",
  "cookie", "*.cookie", "set-cookie", "*.set-cookie",
  "req.headers.authorization", "req.headers.cookie", "res.headers.set-cookie",
  "session", "*.session", "emailBody", "*.emailBody",
  "resume", "*.resume", "presignedUrl", "*.presignedUrl",
];

export const loggerOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? (environment === "test" ? "silent" : "info"),
  base: {
    service: process.env.SERVICE_NAME ?? "job-tracker-backend",
    environment,
    version: process.env.APP_VERSION ?? "development",
    commitSha: process.env.APP_COMMIT_SHA ?? "unknown",
  },
  redact: { paths: sensitiveLogPaths, censor: "[REDACTED]" },
  timestamp: pino.stdTimeFunctions.isoTime,
};

const transport = logFormat === "pretty" && environment !== "test"
  ? pino.transport({ target: "pino-pretty", options: { colorize: true, singleLine: true } })
  : undefined;

/** Shared structured logger for HTTP, startup, background, and security events. */
export const logger: Logger = pino(loggerOptions, transport);
