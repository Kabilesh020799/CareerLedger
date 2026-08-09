import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMock = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("../services/resume-version.service", () => ({
  resumeVersionService: serviceMock,
}));

import { resumeVersionRouter } from "./resume-version.routes";

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
  app.use("/api/resumes", resumeVersionRouter);
  return app;
}

describe("resume version API", () => {
  const app = createTestApp();
  beforeEach(() => vi.clearAllMocks());

  it("lists user resume versions", async () => {
    serviceMock.list.mockResolvedValue([{ id: "resume-1" }]);

    const response = await request(app).get("/api/resumes");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: "resume-1" }]);
    expect(serviceMock.list).toHaveBeenCalledWith("user-1");
  });

  it("validates and creates a resume version", async () => {
    serviceMock.create.mockResolvedValue({
      kind: "success",
      data: { id: "resume-1", name: "Full-stack resume" },
    });

    const response = await request(app)
      .post("/api/resumes")
      .send({ name: " Full-stack resume ", notes: " TypeScript " });

    expect(response.status).toBe(201);
    expect(serviceMock.create).toHaveBeenCalledWith("user-1", {
      name: "Full-stack resume",
      notes: "TypeScript",
    });
  });

  it("rejects invalid and duplicate resume versions", async () => {
    const invalid = await request(app).post("/api/resumes").send({ name: "" });
    serviceMock.create.mockResolvedValue({ kind: "conflict" });
    const duplicate = await request(app)
      .post("/api/resumes")
      .send({ name: "Full-stack resume" });

    expect(invalid.status).toBe(400);
    expect(duplicate.status).toBe(409);
  });

  it("updates an owned resume and hides inaccessible versions", async () => {
    serviceMock.update
      .mockResolvedValueOnce({
        kind: "success",
        data: { id: "resume-1", name: "Backend resume" },
      })
      .mockResolvedValueOnce({ kind: "not_found" });

    const updated = await request(app)
      .patch("/api/resumes/resume-1")
      .send({ name: "Backend resume" });
    const missing = await request(app)
      .patch("/api/resumes/resume-2")
      .send({ notes: null });

    expect(updated.status).toBe(200);
    expect(missing.status).toBe(404);
  });

  it("deletes an owned resume and reports an inaccessible version", async () => {
    serviceMock.remove.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    expect((await request(app).delete("/api/resumes/resume-1")).status).toBe(204);
    expect((await request(app).delete("/api/resumes/resume-2")).status).toBe(404);
  });
});
