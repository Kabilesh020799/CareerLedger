import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reminderServiceMock = vi.hoisted(() => ({
  listForApplication: vi.fn(),
  listOpen: vi.fn(),
  create: vi.fn(),
  updateCompletion: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("../services/reminder.service", () => ({
  reminderService: reminderServiceMock,
}));
vi.mock("../services/application.service", () => ({ applicationService: {} }));
vi.mock("../services/application-event.service", () => ({
  applicationEventService: {},
}));

import { applicationRouter } from "./application.routes";
import { reminderRouter } from "./reminder.routes";

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
  app.use("/api/reminders", reminderRouter);
  return app;
}

describe("reminder API", () => {
  const app = createTestApp();

  beforeEach(() => vi.clearAllMocks());

  it("lists an application's reminders", async () => {
    reminderServiceMock.listForApplication.mockResolvedValue([{ id: "reminder-1" }]);

    const response = await request(app).get(
      "/api/applications/application-1/reminders",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: "reminder-1" }]);
    expect(reminderServiceMock.listForApplication).toHaveBeenCalledWith(
      "user-1",
      "application-1",
    );
  });

  it("creates a valid reminder", async () => {
    const reminder = { id: "reminder-1", type: "DEADLINE" };
    reminderServiceMock.create.mockResolvedValue(reminder);

    const response = await request(app)
      .post("/api/applications/application-1/reminders")
      .send({
        type: "DEADLINE",
        description: "Complete the assessment",
        dueAt: "2026-08-15T14:00:00.000Z",
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(reminder);
    expect(reminderServiceMock.create).toHaveBeenCalledWith(
      "user-1",
      "application-1",
      {
        type: "DEADLINE",
        description: "Complete the assessment",
        dueAt: new Date("2026-08-15T14:00:00.000Z"),
      },
    );
  });

  it("rejects invalid reminder input before calling the service", async () => {
    const response = await request(app)
      .post("/api/applications/application-1/reminders")
      .send({ type: "FOLLOW_UP", description: "", dueAt: "invalid" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid reminder data");
    expect(reminderServiceMock.create).not.toHaveBeenCalled();
  });

  it("lists open reminders with their applications", async () => {
    reminderServiceMock.listOpen.mockResolvedValue([{ id: "reminder-1" }]);

    const response = await request(app).get("/api/reminders");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: "reminder-1" }]);
    expect(reminderServiceMock.listOpen).toHaveBeenCalledWith("user-1");
  });

  it("completes and reopens a reminder", async () => {
    reminderServiceMock.updateCompletion.mockResolvedValue({ id: "reminder-1" });

    const completed = await request(app)
      .patch("/api/reminders/reminder-1")
      .send({ completed: true });
    const reopened = await request(app)
      .patch("/api/reminders/reminder-1")
      .send({ completed: false });

    expect(completed.status).toBe(200);
    expect(reopened.status).toBe(200);
    expect(reminderServiceMock.updateCompletion).toHaveBeenNthCalledWith(
      1,
      "user-1",
      "reminder-1",
      true,
    );
    expect(reminderServiceMock.updateCompletion).toHaveBeenNthCalledWith(
      2,
      "user-1",
      "reminder-1",
      false,
    );
  });

  it("deletes an owned reminder and reports an inaccessible one", async () => {
    reminderServiceMock.remove
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const removed = await request(app).delete("/api/reminders/reminder-1");
    const missing = await request(app).delete("/api/reminders/reminder-2");

    expect(removed.status).toBe(204);
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: "Reminder not found" });
  });
});
