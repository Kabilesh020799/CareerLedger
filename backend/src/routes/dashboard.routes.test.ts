import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dashboardServiceMock = vi.hoisted(() => ({ getSummary: vi.fn() }));

vi.mock("../services/dashboard.service", () => ({
  dashboardService: dashboardServiceMock,
}));

import { dashboardRouter } from "./dashboard.routes";

function createTestApp() {
  const app = express();
  app.use((req, _res, next) => {
    req.user = {
      id: "user-1",
      username: "user-1",
      email: "user-1@example.com",
      name: "User One",
      avatarUrl: null,
    };
    next();
  });
  app.use("/api/dashboard", dashboardRouter);
  return app;
}

describe("dashboard API", () => {
  const app = createTestApp();

  beforeEach(() => vi.clearAllMocks());

  it("returns the authenticated user's summary", async () => {
    const summary = {
      totalApplications: 5,
      createdThisWeek: 2,
      conversionRates: { screening: 50, interview: 25, offer: 0 },
    };
    dashboardServiceMock.getSummary.mockResolvedValue(summary);

    const response = await request(app).get("/api/dashboard/summary");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(summary);
    expect(dashboardServiceMock.getSummary).toHaveBeenCalledWith("user-1");
  });
});
