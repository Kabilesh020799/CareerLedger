import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  process.env.NODE_ENV = "test";
  process.env.ENABLE_PASSWORD_LOGIN = "true";
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
});

const prismaMock = vi.hoisted(() => ({
    user: { create: vi.fn(), findUnique: vi.fn() },
    session: {
      findUnique: vi.fn().mockResolvedValue(null),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      upsert: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
}));

vi.mock("./config/prisma", () => ({ prisma: prismaMock }));

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

vi.mock("./services/signup-abuse-protection.service", () => ({
  signupAbuseProtectionService: {
    begin: vi.fn().mockResolvedValue({
      allowed: true,
      delayMs: 0,
      attempt: {
        accountKey: "signup-account-key",
        accountReference: "signup-account-reference",
        ipReference: "signup-ip-reference",
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
    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("serves Prometheus metrics only from the internal application path", async () => {
    const metrics = await request(app).get("/internal/metrics");
    const publicPath = await request(app).get("/api/metrics");

    expect(metrics.status).toBe(200);
    expect(metrics.headers["content-type"]).toContain("text/plain");
    expect(metrics.text).toContain("job_tracker_info");
    expect(publicPath.status).toBe(404);
  });

  it("generates a canonical request ID without trusting a caller-provided value", async () => {
    const response = await request(app).get("/api/health").set("X-Request-Id", "caller-request-123");

    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers["x-request-id"]).not.toBe("caller-request-123");
  });

  it("includes a request reference in unexpected error responses", async () => {
    const response = await request(app).get("/api/health").set("Origin", "https://untrusted.example");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal server error", requestId: response.headers["x-request-id"] });
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

  it("creates an account and starts an authenticated session", async () => {
    prismaMock.user.create.mockResolvedValueOnce({
      id: "user-1",
      username: "new_user",
      email: "person@example.com",
      name: "New User",
      avatarUrl: null,
    });

    const response = await request(app).post("/api/auth/signup").send({
      name: "New User",
      username: "New_User",
      email: "person@example.com",
      password: "SecurePassword1",
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ username: "new_user", email: "person@example.com" });
    expect(response.headers["set-cookie"]?.[0]).toContain("job-tracker-session");
  });

  it("rejects invalid signup details before creating an account", async () => {
    const response = await request(app).post("/api/auth/signup").send({
      name: "N",
      username: "bad username",
      email: "invalid",
      password: "short",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid account details");
  });

  it("returns a controlled conflict for duplicate signup details", async () => {
    prismaMock.user.create.mockRejectedValueOnce({ code: "P2002" });

    const response = await request(app).post("/api/auth/signup").send({
      name: "Existing User",
      username: "existing_user",
      email: "existing@example.com",
      password: "SecurePassword1",
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "An account already exists with that username or email",
    });
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
