import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  browserExtensionToken: {
    create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn(),
  },
  application: { create: vi.fn() },
}));
vi.mock("../config/prisma", () => ({ prisma: prismaMock }));

import { browserExtensionService } from "./browser-extension.service";

describe("browserExtensionService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores only a hash and returns the token once", async () => {
    prismaMock.browserExtensionToken.create.mockImplementation(async ({ data }) => ({
      id: "token-1", name: data.name, tokenPrefix: data.tokenPrefix, expiresAt: data.expiresAt, createdAt: new Date(),
    }));

    const result = await browserExtensionService.createToken("user-1", "Chrome", new Date("2026-08-10T00:00:00Z"));
    const data = prismaMock.browserExtensionToken.create.mock.calls[0][0].data;

    expect(result.token).toMatch(/^jat_ext_/);
    expect(data.tokenHash).not.toContain(result.token);
    expect(data).not.toHaveProperty("token");
    expect(data.userId).toBe("user-1");
  });

  it("rejects revoked tokens and authenticates active tokens for their owner", async () => {
    prismaMock.browserExtensionToken.findUnique
      .mockResolvedValueOnce({ id: "token-1", userId: "user-1", revokedAt: new Date(), expiresAt: new Date("2027-01-01") })
      .mockResolvedValueOnce({ id: "token-2", userId: "user-2", revokedAt: null, expiresAt: new Date("2027-01-01") });

    await expect(browserExtensionService.authenticate("revoked", new Date("2026-08-10"))).resolves.toBeNull();
    await expect(browserExtensionService.authenticate("active", new Date("2026-08-10"))).resolves.toEqual({ userId: "user-2" });
    expect(prismaMock.browserExtensionToken.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "token-2" } }));
  });

  it("creates a saved application snapshot for the token owner", async () => {
    prismaMock.application.create.mockResolvedValue({ id: "application-1" });
    await browserExtensionService.capture("user-1", {
      company: "Acme", jobTitle: "Engineer", location: "Halifax", jobUrl: "https://jobs.example/1", jobDescription: "Build useful software",
    }, new Date("2026-08-10T12:00:00Z"));

    expect(prismaMock.application.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      userId: "user-1", company: "Acme", status: "SAVED", source: "Browser extension", capturedAt: new Date("2026-08-10T12:00:00Z"),
    }) });
  });
});
