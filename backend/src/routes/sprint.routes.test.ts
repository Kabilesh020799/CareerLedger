import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sprintServiceMock = vi.hoisted(() => ({
  list: vi.fn(),
  current: vi.fn(),
  start: vi.fn(),
}));

vi.mock("../services/sprint.service", () => ({ sprintService: sprintServiceMock }));

import { sprintRouter } from "./sprint.routes";

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
  app.use("/api/sprints", sprintRouter);
  return app;
}

describe("sprint routes", () => {
  const app = createTestApp();

  beforeEach(() => vi.clearAllMocks());

  it("lists sprint history for the selected scope", async () => {
    sprintServiceMock.list.mockResolvedValue([{ id: "sprint-1" }]);

    const response = await request(app)
      .get("/api/sprints")
      .set("X-Workspace-Id", "workspace-1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: "sprint-1" }]);
    expect(sprintServiceMock.list).toHaveBeenCalledWith("user-1", "workspace-1");
  });

  it("returns the current sprint view", async () => {
    sprintServiceMock.current.mockResolvedValue({ sprint: null, applications: [] });

    const response = await request(app).get("/api/sprints/current");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ sprint: null, applications: [] });
    expect(sprintServiceMock.current).toHaveBeenCalledWith("user-1", undefined);
  });

  it("starts a sprint with validated input", async () => {
    sprintServiceMock.start.mockResolvedValue({
      sprint: { id: "sprint-1" },
      previousSprint: null,
      carriedOverCount: 2,
      closedRejectedCount: 0,
    });

    const response = await request(app)
      .post("/api/sprints/start")
      .set("X-Workspace-Id", "workspace-1")
      .send({ name: "Focus week" });

    expect(response.status).toBe(201);
    expect(response.body.carriedOverCount).toBe(2);
    expect(sprintServiceMock.start).toHaveBeenCalledWith(
      "user-1",
      { name: "Focus week" },
      "workspace-1",
    );
  });

  it("rejects an invalid sprint name without starting it", async () => {
    const response = await request(app)
      .post("/api/sprints/start")
      .send({ name: "   " });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid sprint data");
    expect(sprintServiceMock.start).not.toHaveBeenCalled();
  });
});
