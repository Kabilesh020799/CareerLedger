import express from "express";
import session from "express-session";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMock = vi.hoisted(() => ({
  status: vi.fn(),
  beginAuthorization: vi.fn(),
  completeAuthorization: vi.fn(),
  requestSynchronization: vi.fn(),
  synchronizationStatus: vi.fn(),
  updateSchedule: vi.fn(),
  disconnect: vi.fn(),
}));

const reviewServiceMock = vi.hoisted(() => ({
  list: vi.fn(),
  resolve: vi.fn(),
}));

vi.mock("../config/gmail", () => ({
  gmailConfig: { frontendUrl: "http://frontend.test" },
}));
vi.mock("../services/gmail.service", () => {
  class GmailNotConfiguredError extends Error {}
  class GmailNotConnectedError extends Error {}
  class GmailQueueUnavailableError extends Error {}
  return {
    gmailService: serviceMock,
    GmailNotConfiguredError,
    GmailNotConnectedError,
    GmailQueueUnavailableError,
  };
});
vi.mock("../services/gmail-update-review.service", () => {
  class GmailUpdateReviewNotFoundError extends Error {}
  class GmailUpdateReviewConflictError extends Error {}
  return {
    gmailUpdateReviewService: reviewServiceMock,
    GmailUpdateReviewNotFoundError,
    GmailUpdateReviewConflictError,
  };
});

import { GmailNotConnectedError } from "../services/gmail.service";
import { GmailUpdateReviewConflictError } from "../services/gmail-update-review.service";
import { gmailRouter } from "./gmail.routes";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: "gmail-route-test-session-secret",
      resave: false,
      saveUninitialized: true,
    }),
  );
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
  app.use("/api/gmail", gmailRouter);
  return app;
}

describe("Gmail API routes", () => {
  const app = createTestApp();
  beforeEach(() => vi.clearAllMocks());

  it("returns only the authenticated user's public Gmail status", async () => {
    serviceMock.status.mockResolvedValue({
      configured: true,
      connected: true,
      gmailEmail: "gmail@example.com",
      lastSyncedAt: null,
      synchronizedMessages: 0,
    });

    const response = await request(app).get("/api/gmail/status");

    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty("credentials");
    expect(serviceMock.status).toHaveBeenCalledWith("user-1");
  });

  it("validates and updates automatic synchronization", async () => {
    serviceMock.updateSchedule.mockResolvedValue({ automaticSync: { enabled: true, intervalMinutes: 60 } });

    const invalid = await request(app).patch("/api/gmail/schedule").send({ enabled: true, intervalMinutes: 10 });
    const valid = await request(app).patch("/api/gmail/schedule").send({ enabled: true, intervalMinutes: 60 });

    expect(invalid.status).toBe(400);
    expect(valid.status).toBe(200);
    expect(serviceMock.updateSchedule).toHaveBeenCalledWith("user-1", { enabled: true, intervalMinutes: 60 });
  });

  it("persists OAuth state and completes a matching callback", async () => {
    const agent = request.agent(app);
    serviceMock.beginAuthorization.mockReturnValue({
      state: "saved-state",
      authorizationUrl: "https://accounts.google.test/authorize",
    });

    const connect = await agent.get("/api/gmail/connect");
    const callback = await agent.get(
      "/api/gmail/callback?state=saved-state&code=authorization-code",
    );

    expect(connect.status).toBe(302);
    expect(connect.headers.location).toBe(
      "https://accounts.google.test/authorize",
    );
    expect(serviceMock.beginAuthorization).toHaveBeenCalledWith(
      "user-1@example.com",
    );
    expect(serviceMock.completeAuthorization).toHaveBeenCalledWith(
      "user-1",
      "authorization-code",
    );
    expect(callback.headers.location).toBe(
      "http://frontend.test/gmail?connected=true",
    );
  });

  it("rejects a callback whose state does not match the session", async () => {
    const response = await request(app).get(
      "/api/gmail/callback?state=unexpected&code=authorization-code",
    );

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      "http://frontend.test/gmail?error=state",
    );
    expect(serviceMock.completeAuthorization).not.toHaveBeenCalled();
  });

  it("queues synchronization quickly and handles a missing connection", async () => {
    serviceMock.requestSynchronization
      .mockResolvedValueOnce({ jobId: "gmail-manual-user-1", status: "queued" })
      .mockRejectedValueOnce(new GmailNotConnectedError());

    const synchronized = await request(app).post("/api/gmail/sync");
    const disconnected = await request(app).post("/api/gmail/sync");

    expect(synchronized.status).toBe(202);
    expect(synchronized.body).toEqual({ jobId: "gmail-manual-user-1", status: "queued" });
    expect(serviceMock.requestSynchronization).toHaveBeenCalledWith("user-1");
    expect(disconnected.status).toBe(409);
    expect(disconnected.body).toEqual({
      error: "Connect Gmail before synchronizing",
    });
  });

  it("returns only an owned synchronization job's public status", async () => {
    serviceMock.synchronizationStatus.mockResolvedValue({
      jobId: "gmail-manual-user-1",
      status: "running",
    });

    const response = await request(app).get("/api/gmail/sync/gmail-manual-user-1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ jobId: "gmail-manual-user-1", status: "running" });
    expect(serviceMock.synchronizationStatus).toHaveBeenCalledWith(
      "user-1",
      "gmail-manual-user-1",
    );
  });

  it("disconnects the authenticated user's Gmail data", async () => {
    const response = await request(app).delete("/api/gmail/connection");

    expect(response.status).toBe(204);
    expect(serviceMock.disconnect).toHaveBeenCalledWith("user-1");
  });

  it("lists only the authenticated user's pending update reviews", async () => {
    reviewServiceMock.list.mockResolvedValue([
      { id: "review-1", suggestedStatus: "INTERVIEW" },
    ]);

    const response = await request(app).get("/api/gmail/reviews");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: "review-1", suggestedStatus: "INTERVIEW" },
    ]);
    expect(reviewServiceMock.list).toHaveBeenCalledWith("user-1");
  });

  it("validates and resolves an edited Gmail update", async () => {
    reviewServiceMock.resolve.mockResolvedValue({
      review: { id: "review-1", status: "CONFIRMED" },
      application: { id: "application-1", status: "OFFER" },
    });

    const response = await request(app)
      .patch("/api/gmail/reviews/review-1")
      .send({
        action: "CONFIRM",
        applicationId: "application-1",
        status: "OFFER",
      });

    expect(response.status).toBe(200);
    expect(reviewServiceMock.resolve).toHaveBeenCalledWith(
      "user-1",
      "review-1",
      { action: "CONFIRM", applicationId: "application-1", status: "OFFER" },
    );
  });

  it("rejects invalid and already resolved decisions", async () => {
    const invalid = await request(app)
      .patch("/api/gmail/reviews/review-1")
      .send({ action: "CONFIRM", status: "UNKNOWN" });
    expect(invalid.status).toBe(400);
    expect(reviewServiceMock.resolve).not.toHaveBeenCalled();

    reviewServiceMock.resolve.mockRejectedValue(
      new GmailUpdateReviewConflictError("Review was already resolved"),
    );
    const conflict = await request(app)
      .patch("/api/gmail/reviews/review-1")
      .send({ action: "IGNORE" });
    expect(conflict.status).toBe(409);
  });
});
