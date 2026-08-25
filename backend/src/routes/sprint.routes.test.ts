import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { sprintServiceMock, SprintNotEndedErrorMock } = vi.hoisted(() => {
  class SprintNotEndedErrorMock extends Error {
    readonly endsAt: Date;

    constructor(endsAt: Date) {
      super("The current sprint has not ended yet.");
      this.name = "SprintNotEndedError";
      this.endsAt = endsAt;
    }
  }

  return {
    sprintServiceMock: {
      list: vi.fn(),
      current: vi.fn(),
      archived: vi.fn(),
      start: vi.fn(),
    },
    SprintNotEndedErrorMock,
  };
});

vi.mock("../services/sprint.service", () => ({
  sprintService: sprintServiceMock,
  SprintNotEndedError: SprintNotEndedErrorMock,
}));

import { sprintRouter } from "./sprint.routes";
import { generatedOpenApiDocument } from "../config/openapi";

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

  it("returns archived sprint groups for the selected scope", async () => {
    sprintServiceMock.archived.mockResolvedValue([
      { sprint: { id: "sprint-2" }, applications: [{ id: "application-2" }] },
    ]);

    const response = await request(app)
      .get("/api/sprints/archived")
      .set("X-Workspace-Id", "workspace-1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { sprint: { id: "sprint-2" }, applications: [{ id: "application-2" }] },
    ]);
    expect(sprintServiceMock.archived).toHaveBeenCalledWith("user-1", "workspace-1");
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
      .send({ name: "Focus week", durationDays: 21 });

    expect(response.status).toBe(201);
    expect(response.body.carriedOverCount).toBe(2);
    expect(sprintServiceMock.start).toHaveBeenCalledWith(
      "user-1",
      { name: "Focus week", durationDays: 21 },
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

  it("rejects an invalid sprint duration without starting it", async () => {
    const response = await request(app)
      .post("/api/sprints/start")
      .send({ durationDays: 91 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid sprint data");
    expect(sprintServiceMock.start).not.toHaveBeenCalled();
  });

  it("returns 409 with the configured end time when the sprint is still active", async () => {
    const endsAt = new Date("2026-09-07T12:00:00.000Z");
    sprintServiceMock.start.mockRejectedValue(new SprintNotEndedErrorMock(endsAt));

    const response = await request(app)
      .post("/api/sprints/start")
      .send({});

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "The current sprint has not ended yet.",
      endsAt: endsAt.toISOString(),
    });
  });

  it("documents sprint duration fields, start input, and the early-start conflict", () => {
    const sprintSchema = generatedOpenApiDocument.components?.schemas?.Sprint;
    expect(sprintSchema).toMatchObject({
      required: expect.arrayContaining(["durationDays", "endsAt"]),
      properties: {
        durationDays: { type: "integer", minimum: 1, maximum: 90 },
        endsAt: { type: "string", format: "date-time" },
      },
    });

    const operation = generatedOpenApiDocument.paths["/api/sprints/start"]?.post;
    const requestBody = operation && !("$ref" in operation) ? operation.requestBody : undefined;
    const requestSchema =
      requestBody && !("$ref" in requestBody)
        ? requestBody.content?.["application/json"]?.schema
        : undefined;
    expect(requestSchema).toMatchObject({
      properties: {
        durationDays: { type: "integer", minimum: 1, maximum: 90 },
      },
    });

    const responses = operation && !("$ref" in operation) ? operation.responses : undefined;
    expect(responses?.["409"]).toMatchObject({
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/SprintActiveConflict" },
        },
      },
    });

    expect(generatedOpenApiDocument.components?.schemas?.ArchivedSprintGroup).toMatchObject({
      required: ["sprint", "applications"],
    });
    expect(generatedOpenApiDocument.paths["/api/sprints/archived"]?.get).toMatchObject({
      responses: expect.objectContaining({
        "200": expect.objectContaining({
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/ArchivedSprintGroup" },
              },
            },
          },
        }),
      }),
    });
  });
});
