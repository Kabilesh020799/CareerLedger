import { performance } from "node:perf_hooks";
import type { NextFunction, Request, Response } from "express";

export type DatabaseTiming = {
  durationMs: number;
  queryCount: number;
};

/** Adds standards-based timing headers without retaining or logging request data. */
export function requestPerformance(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  const startedAt = performance.now();
  const end = res.end;

  res.end = function timedEnd(
    this: Response,
    ...args: Parameters<typeof end>
  ) {
    if (!res.headersSent) {
      const totalDurationMs = performance.now() - startedAt;
      const databaseTiming = res.locals.databaseTiming as
        | DatabaseTiming
        | undefined;
      const timings = [formatTiming("total", totalDurationMs)];
      if (databaseTiming) {
        timings.unshift(
          `${formatTiming("db", databaseTiming.durationMs)};desc="${databaseTiming.queryCount} queries"`,
        );
      }
      res.setHeader("Server-Timing", timings.join(", "));
      res.setHeader("X-Response-Time-Ms", totalDurationMs.toFixed(1));
    }
    return end.apply(this, args);
  } as typeof res.end;

  next();
}

/** Measures a database-backed service operation for the current response. */
export async function measureDatabase<T>(
  res: Response,
  queryCount: number,
  operation: () => Promise<T>,
) {
  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    res.locals.databaseTiming = {
      durationMs: performance.now() - startedAt,
      queryCount,
    } satisfies DatabaseTiming;
  }
}

function formatTiming(name: string, durationMs: number) {
  return `${name};dur=${durationMs.toFixed(1)}`;
}
