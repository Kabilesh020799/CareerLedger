import { createHmac } from "node:crypto";
import IORedis from "ioredis";
import { authConfig } from "../config/auth";
import { redisConfig } from "../config/redis";
import { logger } from "../config/logger";

const WINDOW_SECONDS = 15 * 60;
const ACCOUNT_ATTEMPT_LIMIT = 8;
const IP_ATTEMPT_LIMIT = 30;
const MAX_PROGRESSIVE_DELAY_MS = 1_200;

const incrementScript = `
local accountCount = redis.call("INCR", KEYS[1])
if accountCount == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
local ipCount = redis.call("INCR", KEYS[2])
if ipCount == 1 then redis.call("EXPIRE", KEYS[2], ARGV[1]) end
return {accountCount, ipCount, redis.call("TTL", KEYS[1]), redis.call("TTL", KEYS[2])}
`;

const recordSuccessScript = `
redis.call("DEL", KEYS[1])
local ipCount = tonumber(redis.call("GET", KEYS[2]) or "0")
if ipCount <= 1 then
  redis.call("DEL", KEYS[2])
else
  redis.call("DECR", KEYS[2])
end
return 1
`;

type RedisLoginClient = Pick<IORedis, "eval" | "connect" | "status" | "on">;

export type LoginAttempt = {
  accountKey: string;
  ipKey: string;
  accountReference: string;
  ipReference: string;
};

export type LoginAttemptDecision = {
  allowed: boolean;
  delayMs: number;
  retryAfterSeconds?: number;
  attempt: LoginAttempt;
};

function opaqueReference(value: string) {
  return createHmac("sha256", authConfig.sessionSecret)
    .update(value)
    .digest("hex")
    .slice(0, 16);
}

function normalizedAccount(username: unknown) {
  return typeof username === "string" && username.trim()
    ? username.trim().toLocaleLowerCase("en-US")
    : "invalid-account-input";
}

function audit(event: string, details: Record<string, string | number | boolean>) {
  logger.warn({ event, ...details }, "authentication security event");
}

function defaultClient() {
  const redis = new IORedis(redisConfig.url, {
    connectTimeout: 1_000,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  redis.on("error", () => undefined);
  return redis;
}

export function createLoginAbuseProtectionService(
  createClient: () => RedisLoginClient = defaultClient,
  writeAudit: typeof audit = audit,
  options: {
    scope?: string;
    accountAttemptLimit?: number;
    ipAttemptLimit?: number;
    clearSuccessfulAttempt?: boolean;
  } = {},
) {
  const scope = options.scope ?? "login";
  const accountAttemptLimit = options.accountAttemptLimit ?? ACCOUNT_ATTEMPT_LIMIT;
  const ipAttemptLimit = options.ipAttemptLimit ?? IP_ATTEMPT_LIMIT;
  const clearSuccessfulAttempt = options.clearSuccessfulAttempt ?? true;
  let redis: RedisLoginClient | undefined;

  async function client() {
    if (!redis || redis.status === "end") redis = createClient();
    if (redis.status === "wait") await redis.connect();
    return redis;
  }

  return {
    async begin(ip: string, username: unknown): Promise<LoginAttemptDecision> {
      const accountReference = opaqueReference(normalizedAccount(username));
      const ipReference = opaqueReference(ip || "unknown-ip");
      const accountKey = `auth:${scope}:account:${accountReference}`;
      const ipKey = `auth:${scope}:ip:${ipReference}`;
      const attempt = { accountKey, ipKey, accountReference, ipReference };

      try {
        const result = await (await client()).eval(
          incrementScript,
          2,
          accountKey,
          ipKey,
          WINDOW_SECONDS,
        );
        if (!Array.isArray(result) || result.length !== 4) {
          throw new Error("Unexpected Redis login-protection response");
        }
        const [accountCount, ipCount, accountTtl, ipTtl] = result.map(Number);
        const blocked =
          accountCount > accountAttemptLimit || ipCount > ipAttemptLimit;
        const pressure = Math.max(accountCount, Math.ceil(ipCount / 4));
        const delayMs = Math.min(
          Math.max(0, pressure - 1) * 150,
          MAX_PROGRESSIVE_DELAY_MS,
        );

        if (blocked) {
          const retryAfterSeconds = Math.max(
            1,
            accountCount > accountAttemptLimit ? accountTtl : ipTtl,
          );
          writeAudit(`auth.${scope}.blocked`, {
            accountReference,
            ipReference,
            retryAfterSeconds,
          });
          return { allowed: false, delayMs, retryAfterSeconds, attempt };
        }

        return { allowed: true, delayMs, attempt };
      } catch {
        writeAudit(`auth.${scope}.protection_unavailable`, {
          accountReference,
          ipReference,
        });
        return { allowed: true, delayMs: 0, attempt };
      }
    },

    async recordFailure(attempt: LoginAttempt) {
      writeAudit(`auth.${scope}.failed`, {
        accountReference: attempt.accountReference,
        ipReference: attempt.ipReference,
      });
    },

    async recordSuccess(attempt: LoginAttempt) {
      try {
        if (clearSuccessfulAttempt) {
          await (await client()).eval(
            recordSuccessScript,
            2,
            attempt.accountKey,
            attempt.ipKey,
          );
        }
      } catch {
        writeAudit(`auth.${scope}.protection_unavailable`, {
          accountReference: attempt.accountReference,
          ipReference: attempt.ipReference,
        });
      }
      writeAudit(`auth.${scope}.succeeded`, {
        accountReference: attempt.accountReference,
        ipReference: attempt.ipReference,
      });
    },
  };
}

export const loginAbuseProtectionService = createLoginAbuseProtectionService();
