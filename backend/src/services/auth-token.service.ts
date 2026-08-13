import { createHash, randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { prisma } from "../config/prisma";
import { emailService } from "./email.service";

const verificationTtlMs = 24 * 60 * 60 * 1000;
const passwordResetTtlMs = 60 * 60 * 1000;

function newToken() {
  return randomBytes(32).toString("base64url");
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export const authTokenService = {
  async requestEmailVerification(email: string) {
    if (!emailService.isAvailable) return;
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, emailVerifiedAt: true },
    });
    if (!user || user.emailVerifiedAt) return;

    const token = newToken();
    await prisma.$transaction([
      prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, consumedAt: null } }),
      prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: tokenHash(token),
          expiresAt: new Date(Date.now() + verificationTtlMs),
        },
      }),
    ]);
    await emailService.sendEmailVerification(user.email, token);
  },

  async verifyEmail(token: string) {
    const now = new Date();
    return prisma.$transaction(async (transaction) => {
      const record = await transaction.emailVerificationToken.findUnique({
        where: { tokenHash: tokenHash(token) },
        select: { id: true, userId: true, expiresAt: true, consumedAt: true },
      });
      if (!record || record.consumedAt || record.expiresAt <= now) return false;
      const consumed = await transaction.emailVerificationToken.updateMany({
        where: { id: record.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) return false;
      await transaction.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: now } });
      return true;
    });
  },

  async requestPasswordReset(email: string) {
    if (!emailService.isAvailable) return;
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!user?.passwordHash) return;

    const token = newToken();
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, consumedAt: null } }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: tokenHash(token),
          expiresAt: new Date(Date.now() + passwordResetTtlMs),
        },
      }),
    ]);
    await emailService.sendPasswordReset(user.email, token);
  },

  async resetPassword(token: string, password: string) {
    const now = new Date();
    const passwordHash = await hash(password, 12);
    return prisma.$transaction(async (transaction) => {
      const record = await transaction.passwordResetToken.findUnique({
        where: { tokenHash: tokenHash(token) },
        select: { id: true, userId: true, expiresAt: true, consumedAt: true },
      });
      if (!record || record.consumedAt || record.expiresAt <= now) return false;
      const consumed = await transaction.passwordResetToken.updateMany({
        where: { id: record.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) return false;
      await transaction.user.update({ where: { id: record.userId }, data: { passwordHash } });
      await transaction.passwordResetToken.deleteMany({
        where: { userId: record.userId, id: { not: record.id } },
      });
      await transaction.session.deleteMany({ where: { userId: record.userId } });
      return true;
    });
  },
};
