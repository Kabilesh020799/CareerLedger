import { prisma } from "../config/prisma";
import { UnrecoverableError } from "bullmq";
import { GmailAuthorizationRequiredError } from "./gmail-api.service";
import {
  GmailNotConfiguredError,
  GmailNotConnectedError,
  gmailService,
} from "./gmail.service";

/** Runs one enabled user's automatic sync and records retry-safe public status. */
export async function processGmailSyncJob(userId: string, attemptedAt = new Date()) {
  const connection = await prisma.gmailConnection.findUnique({
    where: { userId },
    select: { autoSyncEnabled: true },
  });
  if (!connection?.autoSyncEnabled) return;

  await prisma.gmailConnection.update({
    where: { userId },
    data: { lastAutoSyncAttemptAt: attemptedAt },
  });

  try {
    await gmailService.synchronize(userId, attemptedAt);
    await prisma.gmailConnection.update({
      where: { userId },
      data: { lastAutoSyncError: null },
    });
  } catch (error) {
    const authorizationRequired =
      error instanceof GmailAuthorizationRequiredError ||
      error instanceof GmailNotConfiguredError ||
      error instanceof GmailNotConnectedError;
    await prisma.gmailConnection.updateMany({
      where: { userId },
      data: {
        lastAutoSyncError: authorizationRequired
          ? "Reconnect Gmail to resume automatic synchronization"
          : "Automatic synchronization failed and will retry",
      },
    });
    if (authorizationRequired) {
      throw new UnrecoverableError("Gmail must be reconnected before automatic synchronization can continue");
    }
    throw error;
  }
}
