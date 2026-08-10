import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  process.env.NODE_ENV = "test";
  process.env.ENABLE_PASSWORD_LOGIN = "true";
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
});

vi.mock("./config/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    session: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { createApp } from "./app";

describe("authentication API boundary", () => {
  const app = createApp();

  beforeAll(() => vi.spyOn(console, "error").mockImplementation(() => undefined));

  it("keeps the health endpoint public", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("reports an anonymous session without exposing protected data", async () => {
    const response = await request(app).get("/api/auth/session");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: null });
  });

  it("returns 401 before an unauthenticated request reaches application routes", async () => {
    const response = await request(app).get("/api/applications");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Authentication required" });
  });

  it("protects dashboard analytics from unauthenticated requests", async () => {
    const response = await request(app).get("/api/dashboard/summary");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Authentication required" });
  });

  it("protects reminders from unauthenticated requests", async () => {
    const response = await request(app).get("/api/reminders");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Authentication required" });
  });

  it("protects resume versions from unauthenticated requests", async () => {
    const response = await request(app).get("/api/resumes");
    expect(response.status).toBe(401);
  });

  it("protects Gmail synchronization from unauthenticated requests", async () => {
    const synchronization = await request(app).post("/api/gmail/sync");
    const reviews = await request(app).get("/api/gmail/reviews");
    expect(synchronization.status).toBe(401);
    expect(reviews.status).toBe(401);
  });

  it("fails closed when Google credentials are missing", async () => {
    const response = await request(app).get("/api/auth/google");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: "Google authentication is not configured" });
  });

  it("rejects invalid password credentials without identifying the incorrect field", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: "demo", password: "incorrect" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid username or password" });
  });
});
