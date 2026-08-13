import type { NextFunction, Request, Response } from "express";
import { metricsConfig } from "../config/metrics";
import { metricsService } from "../services/metrics.service";

function routeLabel(req: Request) {
  if (req.route?.path) return `${req.baseUrl}${String(req.route.path)}` || "/";
  return "unmatched";
}

/** Records bounded HTTP request counts and latency without user-controlled URL labels. */
export function recordHttpMetrics(req: Request, res: Response, next: NextFunction) {
  if (!metricsConfig.enabled || req.path.endsWith("/metrics")) return next();
  const started = process.hrtime.bigint();
  res.on("finish", () => {
    const labels = { method: req.method, route: routeLabel(req), status: String(res.statusCode) };
    metricsService.increment("job_tracker_http_requests_total", labels);
    metricsService.observe(
      "job_tracker_http_request_duration_seconds",
      Number(process.hrtime.bigint() - started) / 1_000_000_000,
      labels,
    );
  });
  next();
}

export function requireMetricsAccess(req: Request, res: Response, next: NextFunction) {
  if (!metricsConfig.token) return next();
  const authorization = req.get("authorization");
  if (authorization !== `Bearer ${metricsConfig.token}`) {
    res.status(401).json({ error: "Metrics authentication required" });
    return;
  }
  next();
}
