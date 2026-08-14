import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const applicationServiceMock = vi.hoisted(() => ({
  search: vi.fn(),
}));

vi.mock("../services/application.service", () => ({
  applicationService: applicationServiceMock,
}));
vi.mock("../services/application-event.service", () => ({
  applicationEventService: {},
}));

import { applicationRouter } from "./application.routes";
import { requestPerformance } from "../middleware/request-performance";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(requestPerformance);
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
  app.use("/api/applications", applicationRouter);
  return app;
}

describe("application discovery API", () => {
  const app = createTestApp();

  beforeEach(() => vi.clearAllMocks());

  it("returns paginated discovery results", async () => {
    const result = {
      data: [{ id: "application-1" }],
      pagination: { page: 2, limit: 20, total: 21, pages: 2 },
    };
    applicationServiceMock.search.mockResolvedValue(result);

    const response = await request(app).get(
      "/api/applications/search?search=engineer&status=INTERVIEW&source=LinkedIn&page=2",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(result);
    expect(response.headers["server-timing"]).toMatch(
      /^db;dur=\d+\.\d;desc="2 queries", total;dur=\d+\.\d$/,
    );
    expect(applicationServiceMock.search).toHaveBeenCalledWith("user-1", {
      search: "engineer",
      status: "INTERVIEW",
      source: "LinkedIn",
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 2,
      limit: 20,
    }, undefined);
  });

  it.each([
    "/api/applications/search?page=0",
    "/api/applications/search?sortBy=jobTitle",
    "/api/applications/search?appliedFrom=2026-08-01&appliedTo=2026-07-01",
  ])("rejects an invalid query before searching: %s", async (url) => {
    const response = await request(app).get(url);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid application query");
    expect(applicationServiceMock.search).not.toHaveBeenCalled();
  });
});
