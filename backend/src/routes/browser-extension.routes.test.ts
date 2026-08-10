import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMock = vi.hoisted(() => ({
  listTokens: vi.fn(), createToken: vi.fn(), revokeToken: vi.fn(), authenticate: vi.fn(), capture: vi.fn(),
}));
vi.mock("../services/browser-extension.service", () => ({ browserExtensionService: serviceMock }));
import { browserExtensionRouter } from "./browser-extension.routes";

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use((req, _res, next) => {
    req.user = { id: "user-1", username: "user", email: "u@example.com", name: null, avatarUrl: null };
    req.isAuthenticated = () => true;
    next();
  });
  instance.use("/api/browser-extension", browserExtensionRouter);
  return instance;
}

describe("browser extension API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a one-time visible token for the signed-in user", async () => {
    serviceMock.createToken.mockResolvedValue({ id: "token-1", token: "jat_ext_secret" });
    const response = await request(app()).post("/api/browser-extension/tokens").send({ name: "Chrome" });
    expect(response.status).toBe(201);
    expect(serviceMock.createToken).toHaveBeenCalledWith("user-1", "Chrome");
  });

  it("captures a reviewed posting for the bearer-token owner", async () => {
    serviceMock.authenticate.mockResolvedValue({ userId: "owner-1" });
    serviceMock.capture.mockResolvedValue({ id: "application-1" });
    const response = await request(app()).post("/api/browser-extension/captures")
      .set("authorization", "Bearer jat_ext_valid")
      .send({ company: "Acme", jobTitle: "Engineer", location: "Remote", jobUrl: "https://jobs.example/1", jobDescription: "Description" });
    expect(response.status).toBe(201);
    expect(serviceMock.capture).toHaveBeenCalledWith("owner-1", expect.objectContaining({ company: "Acme" }));
  });

  it("rejects revoked tokens and invalid captured data", async () => {
    serviceMock.authenticate.mockResolvedValueOnce(null).mockResolvedValueOnce({ userId: "owner-1" });
    const revoked = await request(app()).post("/api/browser-extension/captures").set("authorization", "Bearer revoked").send({});
    const invalid = await request(app()).post("/api/browser-extension/captures").set("authorization", "Bearer valid").send({ company: "" });
    expect(revoked.status).toBe(401);
    expect(invalid.status).toBe(400);
    expect(serviceMock.capture).not.toHaveBeenCalled();
  });
});
