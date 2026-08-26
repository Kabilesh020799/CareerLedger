import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  sprintServiceMock,
  SprintNotEndedErrorMock,
  SprintNotFoundErrorMock,
  SprintScheduleConflictErrorMock,
} = vi.hoisted(() => {
  class SprintNotEndedErrorMock extends Error {
    readonly endsAt: Date;

    constructor(endsAt: Date) {
      super("The current sprint has not ended yet.");
      this.name = "SprintNotEndedError";
      this.endsAt = endsAt;
    }
  }

  class SprintScheduleConflictErrorMock extends Error {
    readonly scheduledStartAt?: Date;
    readonly requiredStartAt?: Date;

    constructor(
      message: string,
      details: { scheduledStartAt?: Date; requiredStartAt?: Date } = {},
    ) {
      super(message);
      this.name = "SprintScheduleConflictError";
      this.scheduledStartAt = details.scheduledStartAt;
      this.requiredStartAt = details.requiredStartAt;
    }
  }

  class SprintNotFoundErrorMock extends Error {
    constructor() {
      super("Sprint not found");
      this.name = "SprintNotFoundError";
    }
  }

  return {
    sprintServiceMock: {
      list: vi.fn(),
      current: vi.fn(),
      archived: vi.fn(),
      schedule: vi.fn(),
      updateScheduled: vi.fn(),
      cancelScheduled: vi.fn(),
      start: vi.fn(),
    },
    SprintNotEndedErrorMock,
    SprintNotFoundErrorMock,
    SprintScheduleConflictErrorMock,
  };
});

vi.mock("../services/sprint.service", () => ({
  sprintService: sprintServiceMock,
  SprintNotEndedError: SprintNotEndedErrorMock,
  SprintNotFoundError: SprintNotFoundErrorMock,
  SprintScheduleConflictError: SprintScheduleConflictErrorMock,
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

  it("schedules a sprint with validated input in the selected scope", async () => {
    sprintServiceMock.schedule.mockResolvedValue({
      id: "sprint-2",
      status: "SCHEDULED",
    });
    const startsAt = "2026-09-01T12:00:00.000Z";

    const response = await request(app)
      .post("/api/sprints/schedule")
      .set("X-Workspace-Id", "workspace-1")
      .send({ name: "September push", durationDays: 21, startsAt });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: "sprint-2", status: "SCHEDULED" });
    expect(sprintServiceMock.schedule).toHaveBeenCalledWith(
      "user-1",
      {
        name: "September push",
        durationDays: 21,
        startsAt: new Date(startsAt),
      },
      "workspace-1",
    );
  });

  it("rejects an invalid scheduled sprint without calling the service", async () => {
    const response = await request(app)
      .post("/api/sprints/schedule")
      .send({ startsAt: "2026-09-01" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid scheduled sprint data");
    expect(sprintServiceMock.schedule).not.toHaveBeenCalled();
  });

  it("updates a scheduled sprint with validated input", async () => {
    sprintServiceMock.updateScheduled.mockResolvedValue({
      id: "sprint-2",
      name: "October focus",
      status: "SCHEDULED",
    });
    const startsAt = "2026-10-01T12:00:00.000Z";

    const response = await request(app)
      .patch("/api/sprints/sprint-2")
      .set("X-Workspace-Id", "workspace-1")
      .send({ name: "October focus", durationDays: 21, startsAt });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: "sprint-2",
      name: "October focus",
      status: "SCHEDULED",
    });
    expect(sprintServiceMock.updateScheduled).toHaveBeenCalledWith(
      "user-1",
      "sprint-2",
      { name: "October focus", durationDays: 21, startsAt: new Date(startsAt) },
      "workspace-1",
    );
  });

  it("rejects an empty scheduled-sprint update without calling the service", async () => {
    const response = await request(app)
      .patch("/api/sprints/sprint-2")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid scheduled sprint data");
    expect(sprintServiceMock.updateScheduled).not.toHaveBeenCalled();
  });

  it("returns safe errors for scheduled-sprint updates", async () => {
    const startsAt = new Date("2026-10-01T12:00:00.000Z");
    sprintServiceMock.updateScheduled.mockRejectedValue(
      new SprintScheduleConflictErrorMock("The scheduled sprint overlaps an existing plan.", {
        scheduledStartAt: startsAt,
        requiredStartAt: new Date("2026-10-08T12:00:00.000Z"),
      }),
    );

    const conflictResponse = await request(app)
      .patch("/api/sprints/sprint-2")
      .send({ startsAt: startsAt.toISOString() });

    expect(conflictResponse.status).toBe(409);
    expect(conflictResponse.body).toEqual({
      error: "The scheduled sprint overlaps an existing plan.",
      scheduledStartAt: startsAt.toISOString(),
      requiredStartAt: "2026-10-08T12:00:00.000Z",
    });

    sprintServiceMock.updateScheduled.mockRejectedValue(new SprintNotFoundErrorMock());
    const missingResponse = await request(app).patch("/api/sprints/missing").send({ name: "Updated" });
    expect(missingResponse.status).toBe(404);
    expect(missingResponse.body).toEqual({ error: "Sprint not found" });
  });

  it("cancels a scheduled sprint and returns no content", async () => {
    sprintServiceMock.cancelScheduled.mockResolvedValue(undefined);

    const response = await request(app)
      .delete("/api/sprints/sprint-2")
      .set("X-Workspace-Id", "workspace-1");

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
    expect(sprintServiceMock.cancelScheduled).toHaveBeenCalledWith(
      "user-1",
      "sprint-2",
      "workspace-1",
    );
  });

  it("returns not found when a scheduled sprint cannot be canceled", async () => {
    sprintServiceMock.cancelScheduled.mockRejectedValue(new SprintNotFoundErrorMock());

    const response = await request(app).delete("/api/sprints/sprint-2");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Sprint not found" });
  });

  it("returns a safe 409 for scheduling conflicts", async () => {
    const startsAt = new Date("2026-09-01T12:00:00.000Z");
    sprintServiceMock.schedule.mockRejectedValue(
      new SprintScheduleConflictErrorMock("The scheduled sprint overlaps an existing plan.", {
        scheduledStartAt: startsAt,
        requiredStartAt: new Date("2026-09-08T12:00:00.000Z"),
      }),
    );

    const response = await request(app)
      .post("/api/sprints/schedule")
      .send({ startsAt: startsAt.toISOString() });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "The scheduled sprint overlaps an existing plan.",
      scheduledStartAt: startsAt.toISOString(),
      requiredStartAt: "2026-09-08T12:00:00.000Z",
    });
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
        scheduledSprintId: { type: "string" },
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
    expect(sprintSchema).toMatchObject({
      properties: {
        status: { enum: ["ACTIVE", "CLOSED", "SCHEDULED"] },
        scheduledStartAt: { type: "string", format: "date-time", nullable: true },
      },
    });
    expect(generatedOpenApiDocument.components?.schemas?.SprintScheduleConflict).toMatchObject({
      required: ["error"],
    });
    expect(generatedOpenApiDocument.paths["/api/sprints/schedule"]?.post).toMatchObject({
      responses: expect.objectContaining({
        "201": expect.anything(),
        "409": expect.objectContaining({
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SprintScheduleConflict" },
            },
          },
        }),
      }),
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
    expect(generatedOpenApiDocument.paths["/api/sprints/{id}"]).toMatchObject({
      patch: expect.objectContaining({
        responses: expect.objectContaining({
          "200": expect.anything(),
          "409": expect.objectContaining({
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SprintScheduleConflict" },
              },
            },
          }),
        }),
      }),
      delete: expect.objectContaining({
        responses: expect.objectContaining({ "204": expect.anything() }),
      }),
    });
  });
});
