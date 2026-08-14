import { compare, hashSync } from "bcryptjs";
import { prisma } from "../config/prisma";
import type { DeleteAccountInput, UpdateProfileInput } from "../validators/account.validator";
import { applicationResumeStorageService } from "./application-resume-storage.service";
import { emailService } from "./email.service";
import { gmailSyncQueueService } from "./gmail-sync-queue.service";

const fallbackPasswordHash = hashSync("unavailable-account-password", 12);
const publicProfileSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
  avatarUrl: true,
  emailVerifiedAt: true,
  passwordHash: true,
  googleId: true,
} as const;

function publicProfile(user: {
  id: string;
  username: string | null;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  emailVerifiedAt: Date | null;
  passwordHash: string | null;
  googleId: string | null;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    emailVerified: Boolean(user.emailVerifiedAt),
    emailDeliveryAvailable: emailService.isAvailable,
    authMethods: {
      password: Boolean(user.passwordHash),
      google: Boolean(user.googleId),
    },
  };
}

export class AccountConfirmationError extends Error {}

export const accountService = {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: publicProfileSelect });
    return user ? publicProfile(user) : null;
  },

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name: input.name.trim() },
      select: publicProfileSelect,
    });
    return publicProfile(user);
  },

  async deleteAccount(userId: string, input: DeleteAccountInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, passwordHash: true },
    });
    const passwordMatches = await compare(
      input.password ?? "",
      user?.passwordHash ?? fallbackPasswordHash,
    );
    const validEmail = user?.email === input.email.trim().toLowerCase();
    const validPassword = user?.passwordHash ? passwordMatches : true;
    if (!user || !validEmail || !validPassword) {
      throw new AccountConfirmationError("Account confirmation failed");
    }

    const storageKeys = await prisma.$transaction(async (transaction) => {
      const resumes = await transaction.applicationResume.findMany({
        where: { application: { userId } },
        select: { storageKey: true },
      });
      const keys = resumes.flatMap(({ storageKey }) => storageKey ? [storageKey] : []);
      if (keys.length) {
        await transaction.resumeObjectDeletion.createMany({
          data: keys.map((storageKey) => ({ storageKey })),
          skipDuplicates: true,
        });
      }
      await transaction.session.deleteMany({ where: { userId } });
      await transaction.user.delete({ where: { id: userId } });
      return keys;
    });

    await gmailSyncQueueService.unschedule(userId).catch(() => undefined);
    await Promise.allSettled(
      storageKeys.map((storageKey) =>
        applicationResumeStorageService.processQueuedDeletion(storageKey),
      ),
    );
  },
};
