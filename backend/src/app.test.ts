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

vi.mock("./services/login-abuse-protection.service", () => ({
  loginAbuseProtectionService: {
    begin: vi.fn().mockResolvedValue({
      allowed: true,
      delayMs: 0,
      attempt: {
        accountKey: "account-key",
        accountReference: "account-reference",
        ipReference: "ip-reference",
      },
    }),
    recordFailure: vi.fn().mockResolvedValue(undefined),
    recordSuccess: vi.fn().mockResolvedValue(undefined),
  },
}));

import { createApp } from "./app";
import { loginAbuseProtectionService } from "./services/login-abuse-protection.service";

describe("authentication API boundary", () => {
  const app = createApp();

  beforeAll(() => vi.spyOn(console, "error").mockImplementation(() => undefined));

  it("keeps the health endpoint public", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("allows browser-extension origins without exposing application sessions", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("origin", "chrome-extension://extension-id");
    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("chrome-extension://extension-id");
  });

  it("reports an anonymous session without exposing protected data", async () => {
    const response = await request(app).get("/api/auth/session");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: null });
  });

  it("returns 401 before an unauthenticated request reaches application routes", async () => {
    const response = await request(app).get("/api/applications");
    const resume = await request(app).get(
      "/api/applications/application-1/resume",
    );

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Authentication required" });
    expect(resume.status).toBe(401);
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
    const schedule = await request(app).patch("/api/gmail/schedule");
    const reviews = await request(app).get("/api/gmail/reviews");
    expect(synchronization.status).toBe(401);
    expect(schedule.status).toBe(401);
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

  it("returns the same failure for malformed password credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: "demo" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid username or password" });
  });

  it("returns a retry interval when login protection blocks an attempt", async () => {
    vi.mocked(loginAbuseProtectionService.begin).mockResolvedValueOnce({
      allowed: false,
      delayMs: 0,
      retryAfterSeconds: 600,
      attempt: {
        accountKey: "account-key",
        accountReference: "account-reference",
        ipReference: "ip-reference",
      },
    });

    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: "demo", password: "incorrect" });

    expect(response.status).toBe(429);
    expect(response.headers["retry-after"]).toBe("600");
    expect(response.body).toEqual({
      error: "Too many login attempts. Try again later.",
    });
  });
});
