import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { recordHttpMetrics } from "./metrics";
import { metricsService } from "../services/metrics.service";

describe("recordHttpMetrics", () => {
  beforeEach(() => metricsService.resetForTests());

  it("records method, normalized route, status, and duration", async () => {
    const app = express();
    app.use(recordHttpMetrics);
    app.get("/applications/:id", (_req, res) => res.status(201).send());
    await request(app).get("/applications/private-id").expect(201);

    const output = metricsService.render();
    expect(output).toContain('job_tracker_http_requests_total{method="GET",route="/applications/:id",status="201"} 1');
    expect(output).not.toContain("private-id");
  });
});
