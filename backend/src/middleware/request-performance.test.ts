import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { measureDatabase, requestPerformance } from "./request-performance";

describe("requestPerformance", () => {
  it("reports total and measured database time without logging request data", async () => {
    const app = express();
    app.use(requestPerformance);
    app.get("/timed", async (_req, res) => {
      await measureDatabase(res, 2, async () => Promise.resolve());
      res.json({ ok: true });
    });

    const response = await request(app).get("/timed");

    expect(response.status).toBe(200);
    expect(response.headers["server-timing"]).toMatch(
      /^db;dur=\d+\.\d;desc="2 queries", total;dur=\d+\.\d$/,
    );
    expect(response.headers["x-response-time-ms"]).toMatch(/^\d+\.\d$/);
  });
});
