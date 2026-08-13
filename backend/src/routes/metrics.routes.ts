import { Router } from "express";
import { requireMetricsAccess } from "../middleware/metrics";
import { metricsService } from "../services/metrics.service";

export const metricsRouter = Router();

metricsRouter.get("/", requireMetricsAccess, (_req, res) => {
  res.type("text/plain; version=0.0.4; charset=utf-8").send(metricsService.render());
});
