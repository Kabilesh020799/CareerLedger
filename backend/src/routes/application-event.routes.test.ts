import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const applicationEventServiceMock = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
}));

vi.mock("../services/application-event.service", () => ({
  applicationEventService: applicationEventServiceMock,
}));
vi.mock("../services/application.service", () => ({
  applicationService: {},
}));

import { applicationRouter } from "./application.routes";

function createTestApp() {
  const app = express();
  app.use(express.json());
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

describe("application timeline API", () => {
  const app = createTestApp();

  beforeEach(() => vi.clearAllMocks());

  it("returns an owned application's events", async () => {
    applicationEventServiceMock.list.mockResolvedValue([{ id: "event-1" }]);

    const response = await request(app).get(
      "/api/applications/application-1/events",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: "event-1" }]);
    expect(applicationEventServiceMock.list).toHaveBeenCalledWith(
      "user-1",
      "application-1",
    );
  });

  it("reports an inaccessible application as not found", async () => {
    applicationEventServiceMock.list.mockResolvedValue(null);

    const response = await request(app).get(
      "/api/applications/application-2/events",
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Application not found" });
  });

  it("creates a valid manual note", async () => {
    const event = {
      id: "event-1",
      applicationId: "application-1",
      type: "NOTE",
      description: "Followed up with the recruiter.",
      occurredAt: "2026-08-07T15:30:00.000Z",
    };
    applicationEventServiceMock.create.mockResolvedValue(event);

    const response = await request(app)
      .post("/api/applications/application-1/events")
      .send({
        type: "NOTE",
        description: "Followed up with the recruiter.",
        occurredAt: "2026-08-07T15:30:00.000Z",
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(event);
    expect(applicationEventServiceMock.create).toHaveBeenCalledWith(
      "user-1",
      "application-1",
      {
        type: "NOTE",
        description: "Followed up with the recruiter.",
        occurredAt: new Date("2026-08-07T15:30:00.000Z"),
      },
    );
  });

  it("rejects a note without a description", async () => {
    const response = await request(app)
      .post("/api/applications/application-1/events")
      .send({
        type: "NOTE",
        description: "   ",
        occurredAt: "2026-08-07T15:30:00.000Z",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid application event data");
    expect(applicationEventServiceMock.create).not.toHaveBeenCalled();
  });
});
