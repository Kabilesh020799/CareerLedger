import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  emailVerificationToken: { deleteMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  passwordResetToken: { deleteMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  session: { deleteMany: vi.fn() },
  $transaction: vi.fn(),
}));
const emailMock = vi.hoisted(() => ({
  isAvailable: true,
  sendEmailVerification: vi.fn(),
  sendPasswordReset: vi.fn(),
}));

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));
vi.mock("./email.service", () => ({ emailService: emailMock }));

import { authTokenService } from "./auth-token.service";

describe("authTokenService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emailMock.isAvailable = true;
    prismaMock.$transaction.mockImplementation(async (input: unknown) =>
      typeof input === "function" ? input(prismaMock) : Promise.all(input as Promise<unknown>[]),
    );
  });

  it("stores a hash but emails the raw verification token", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1", email: "user@example.com", emailVerifiedAt: null });
    prismaMock.emailVerificationToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.emailVerificationToken.create.mockResolvedValue({});

    await authTokenService.requestEmailVerification("USER@example.com");

    const data = prismaMock.emailVerificationToken.create.mock.calls[0][0].data;
    const emailedToken = emailMock.sendEmailVerification.mock.calls[0][1];
    expect(data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.tokenHash).not.toBe(emailedToken);
    expect(emailMock.sendEmailVerification).toHaveBeenCalledWith("user@example.com", expect.any(String));
  });

  it("silently does nothing when email delivery is unavailable", async () => {
    emailMock.isAvailable = false;
    await authTokenService.requestPasswordReset("user@example.com");
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(emailMock.sendPasswordReset).not.toHaveBeenCalled();
  });

  it("rejects an expired verification token", async () => {
    prismaMock.emailVerificationToken.findUnique.mockResolvedValue({
      id: "token-1", userId: "user-1", consumedAt: null, expiresAt: new Date(Date.now() - 1),
    });
    await expect(authTokenService.verifyEmail("a".repeat(32))).resolves.toBe(false);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("atomically resets the password and revokes every session", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      id: "token-1", userId: "user-1", consumedAt: null, expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.session.deleteMany.mockResolvedValue({ count: 2 });

    await expect(authTokenService.resetPassword("b".repeat(32), "ReplacementPassword1")).resolves.toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: expect.not.stringContaining("ReplacementPassword1") },
    });
    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });
});
