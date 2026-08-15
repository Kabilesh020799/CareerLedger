import { hash } from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { create: vi.fn(), findUnique: vi.fn() },
}));

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../config/admin", () => ({
  isAdminAccount: (email: string) => email === "admin@example.com",
}));

import { credentialAuthService } from "./credential-auth.service";

describe("credentialAuthService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a normalized account without returning its password hash", async () => {
    prismaMock.user.create.mockResolvedValue({
      id: "user-1",
      username: "new_user",
      email: "person@example.com",
      name: "New User",
      avatarUrl: null,
    });

    const user = await credentialAuthService.register({
      name: " New User ",
      username: "New_User",
      email: "PERSON@EXAMPLE.COM",
      password: "SecurePassword1",
    });

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "New User",
        username: "new_user",
        email: "person@example.com",
        passwordHash: expect.not.stringContaining("SecurePassword1"),
      }),
      select: expect.not.objectContaining({ passwordHash: true }),
    });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("reports duplicate usernames or emails as a controlled conflict", async () => {
    prismaMock.user.create.mockRejectedValue({ code: "P2002" });

    await expect(credentialAuthService.register({
      name: "New User",
      username: "new_user",
      email: "person@example.com",
      password: "SecurePassword1",
    })).rejects.toThrow("An account already exists with that username or email");
  });

  it("does not create an administrator through public signup", async () => {
    await expect(credentialAuthService.register({
      name: "Admin",
      username: "admin",
      email: "ADMIN@EXAMPLE.COM",
      password: "SecurePassword1",
    })).rejects.toThrow("An account already exists with that username or email");
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("returns the public user for a valid password without returning its hash", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "demo-user",
      username: "demo",
      email: "demo@jobtracker.local",
      name: "Demo User",
      avatarUrl: null,
      passwordHash: await hash("ValidTestPassword1", 4),
    });

    const user = await credentialAuthService.authenticate({
      username: "DEMO",
      password: "ValidTestPassword1",
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
