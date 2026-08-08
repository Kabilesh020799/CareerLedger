import { hash } from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
}));

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));

import { credentialAuthService } from "./credential-auth.service";

describe("credentialAuthService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the public user for a valid password without returning its hash", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "demo-user",
      username: "demo",
      email: "demo@jobtracker.local",
      name: "Demo User",
      avatarUrl: null,
      passwordHash: await hash("JobTrackerDemo123!", 4),
    });

    const user = await credentialAuthService.authenticate({
      username: "DEMO",
      password: "JobTrackerDemo123!",
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { username: "demo" } }),
    );
    expect(user).toEqual({
      id: "demo-user",
      username: "demo",
      email: "demo@jobtracker.local",
      name: "Demo User",
      avatarUrl: null,
    });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("returns the same failure for an unknown user and an incorrect password", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(
      credentialAuthService.authenticate({ username: "missing", password: "password" }),
    ).resolves.toBeNull();

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "demo-user",
      username: "demo",
      email: "demo@jobtracker.local",
      name: "Demo User",
      avatarUrl: null,
      passwordHash: await hash("correct-password", 4),
    });
    await expect(
      credentialAuthService.authenticate({ username: "demo", password: "incorrect" }),
    ).resolves.toBeNull();
  });
});
