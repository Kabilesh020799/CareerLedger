import express from "express";
import session from "express-session";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMock = vi.hoisted(() => ({
  status: vi.fn(),
  beginAuthorization: vi.fn(),
  completeAuthorization: vi.fn(),
  synchronize: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("../config/gmail", () => ({
  gmailConfig: { frontendUrl: "http://frontend.test" },
}));
vi.mock("../services/gmail.service", () => {
  class GmailNotConfiguredError extends Error {}
  class GmailNotConnectedError extends Error {}
  return {
    gmailService: serviceMock,
    GmailNotConfiguredError,
    GmailNotConnectedError,
  };
});

import { GmailNotConnectedError } from "../services/gmail.service";
import { gmailRouter } from "./gmail.routes";

function createTestApp() {
  const app = express();
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

  it("returns synchronization counts and handles a missing connection", async () => {
    serviceMock.synchronize
      .mockResolvedValueOnce({
        synchronizationType: "incremental",
        fetchedMessages: 2,
        newMessages: 1,
        duplicateMessages: 1,
        lastSyncedAt: "2026-08-09T21:00:00.000Z",
      })
      .mockRejectedValueOnce(new GmailNotConnectedError());

    const synchronized = await request(app).post("/api/gmail/sync");
    const disconnected = await request(app).post("/api/gmail/sync");

    expect(synchronized.status).toBe(200);
    expect(synchronized.body).toMatchObject({ newMessages: 1 });
    expect(disconnected.status).toBe(409);
    expect(disconnected.body).toEqual({
      error: "Connect Gmail before synchronizing",
    });
  });

  it("disconnects the authenticated user's Gmail data", async () => {
    const response = await request(app).delete("/api/gmail/connection");

    expect(response.status).toBe(204);
    expect(serviceMock.disconnect).toHaveBeenCalledWith("user-1");
  });
});
