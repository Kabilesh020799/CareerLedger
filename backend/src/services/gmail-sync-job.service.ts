import { prisma } from "../config/prisma";
import { UnrecoverableError } from "bullmq";
import { GmailAuthorizationRequiredError } from "./gmail-api.service";
import {
  GmailNotConfiguredError,
  GmailNotConnectedError,
  gmailService,
} from "./gmail.service";
import type { GmailSyncJobTrigger } from "./gmail-sync-queue.service";

/** Runs a queued sync; automatic jobs additionally update their public schedule status. */
export async function processGmailSyncJob(
  userId: string,
  trigger: GmailSyncJobTrigger = "automatic",
  attemptedAt = new Date(),
) {
  if (trigger === "automatic") {
    const connection = await prisma.gmailConnection.findUnique({
      where: { userId },
      select: { autoSyncEnabled: true },
    });
    if (!connection?.autoSyncEnabled) return;

    await prisma.gmailConnection.update({
      where: { userId },
      data: { lastAutoSyncAttemptAt: attemptedAt },
    });
  }

  try {
    const result = await gmailService.synchronize(userId, attemptedAt);
    if (trigger === "automatic") {
      await prisma.gmailConnection.update({
        where: { userId },
        data: { lastAutoSyncError: null },
      });
    }
    return result;
  } catch (error) {
    const authorizationRequired =
      error instanceof GmailAuthorizationRequiredError ||
      error instanceof GmailNotConfiguredError ||
      error instanceof GmailNotConnectedError;
    if (trigger === "automatic") {
      await prisma.gmailConnection.updateMany({
        where: { userId },
        data: {
          lastAutoSyncError: authorizationRequired
            ? "Reconnect Gmail to resume automatic synchronization"
            : "Automatic synchronization failed and will retry",
        },
      });
    }
    if (authorizationRequired) {
      throw new UnrecoverableError("Gmail must be reconnected before synchronization can continue");
    }
    throw error;
  }
}
