import { randomBytes } from "node:crypto";
import { isGmailConfigured } from "../config/gmail";
import { prisma } from "../config/prisma";
import { decryptJson, encryptJson } from "../utils/encrypted-json";
import {
  gmailApiService,
  type GmailCredentials,
} from "./gmail-api.service";
import { buildGmailUpdateSuggestion } from "./gmail-update-review.service";
import { gmailSyncQueueService } from "./gmail-sync-queue.service";
import type { UpdateGmailScheduleInput } from "../validators/gmail-schedule.validator";

export class GmailNotConfiguredError extends Error {}
export class GmailNotConnectedError extends Error {}
export class GmailQueueUnavailableError extends Error {}

const CURRENT_GMAIL_CLASSIFICATION_VERSION = 3;

export const gmailService = {
  async status(userId: string) {
    if (!isGmailConfigured) {
      return {
        configured: false,
        connected: false,
        gmailEmail: null,
        lastSyncedAt: null,
        synchronizedMessages: 0,
        automaticSync: { enabled: false, intervalMinutes: 60, lastAttemptAt: null, lastError: null },
      };
    }

    const connection = await prisma.gmailConnection.findUnique({
      where: { userId },
      select: {
        gmailEmail: true,
        lastSyncedAt: true,
        autoSyncEnabled: true,
        autoSyncIntervalMins: true,
        lastAutoSyncAttemptAt: true,
        lastAutoSyncError: true,
        _count: { select: { messages: true } },
      },
    });

    return {
      configured: true,
      connected: Boolean(connection),
      gmailEmail: connection?.gmailEmail ?? null,
      lastSyncedAt: connection?.lastSyncedAt?.toISOString() ?? null,
      synchronizedMessages: connection?._count.messages ?? 0,
      automaticSync: {
        enabled: connection?.autoSyncEnabled ?? false,
        intervalMinutes: connection?.autoSyncIntervalMins ?? 60,
        lastAttemptAt: connection?.lastAutoSyncAttemptAt?.toISOString() ?? null,
        lastError: connection?.lastAutoSyncError ?? null,
      },
    };
  },

  beginAuthorization(loginHint: string) {
    ensureConfigured();
    const state = randomBytes(32).toString("base64url");
    return {
      state,
      authorizationUrl: gmailApiService.authorizationUrl(state, loginHint),
    };
  },

  async completeAuthorization(userId: string, code: string) {
    ensureConfigured();
    const exchangedCredentials =
      await gmailApiService.exchangeAuthorizationCode(code);
    const profile = await gmailApiService.profile(exchangedCredentials);
    const encryptedCredentials = encryptJson(profile.credentials);

    await prisma.$transaction(async (transaction) => {
      const existing = await transaction.gmailConnection.findUnique({
        where: { userId },
        select: { id: true, gmailEmail: true },
      });

      if (!existing) {
        await transaction.gmailConnection.create({
          data: {
            userId,
            gmailEmail: profile.emailAddress,
            encryptedCredentials,
          },
        });
        return;
      }

      const changedAccount =
        existing.gmailEmail.toLocaleLowerCase("en-US") !==
        profile.emailAddress.toLocaleLowerCase("en-US");
      if (changedAccount) {
        await transaction.gmailMessage.deleteMany({
          where: { connectionId: existing.id },
        });
      }

      await transaction.gmailConnection.update({
        where: { id: existing.id },
        data: {
          gmailEmail: profile.emailAddress,
          encryptedCredentials,
          ...(changedAccount
            ? { historyId: null, lastSyncedAt: null }
            : undefined),
        },
      });
    });

    return { gmailEmail: profile.emailAddress };
  },

  async synchronize(userId: string, now = new Date()) {
    ensureConfigured();
    const connection = await prisma.gmailConnection.findUnique({
      where: { userId },
      select: {
        id: true,
        encryptedCredentials: true,
        historyId: true,
        user: { select: { email: true } },
      },
    });
    if (!connection) throw new GmailNotConnectedError("Gmail is not connected");

    const credentials = decryptJson<GmailCredentials>(
      connection.encryptedCredentials,
    );
    const synchronization = await gmailApiService.synchronize(
      credentials,
      connection.historyId,
    );

    const [existingMessages, unprocessedMessages] = await Promise.all([
      synchronization.messages.length
        ? prisma.gmailMessage.findMany({
            where: {
              connectionId: connection.id,
              gmailMessageId: {
                in: synchronization.messages.map((message) => message.id),
              },
            },
            select: { gmailMessageId: true },
          })
        : [],
      prisma.gmailMessage.findMany({
        where: {
          connectionId: connection.id,
          OR: [
            { processedAt: null },
            { classificationVersion: { lt: CURRENT_GMAIL_CLASSIFICATION_VERSION } },
          ],
        },
        select: { gmailMessageId: true, threadId: true },
        orderBy: { createdAt: "asc" },
        take: 100,
      }),
    ]);
    const existingIds = new Set(
      existingMessages.map((message) => message.gmailMessageId),
    );
    const newReferences = synchronization.messages.filter(
      (message) => !existingIds.has(message.id),
    );
    const referencesToProcess = [
      ...new Map(
        [...unprocessedMessages.map((message) => ({
          id: message.gmailMessageId,
          threadId: message.threadId,
        })), ...newReferences].map((message) => [message.id, message]),
      ).values(),
    ];

    const [metadataResult, applications] = referencesToProcess.length
      ? await Promise.all([
          gmailApiService.metadata(
            synchronization.credentials,
            referencesToProcess,
          ),
          prisma.application.findMany({
            where: { userId },
            select: {
              id: true,
              company: true,
              jobTitle: true,
              appliedAt: true,
              createdAt: true,
            },
          }),
        ])
      : [{ credentials: synchronization.credentials, messages: [] }, []];
    const suggestions: NonNullable<
      Awaited<ReturnType<typeof buildGmailUpdateSuggestion>>
    >[] = [];
    for (const message of metadataResult.messages) {
      const suggestion = await buildGmailUpdateSuggestion(
        message,
        applications,
        connection.user.email,
      );
      if (suggestion) suggestions.push(suggestion);
    }

    const result = await prisma.$transaction(async (transaction) => {
      const created = newReferences.length
        ? await transaction.gmailMessage.createMany({
            data: newReferences.map((message) => ({
              connectionId: connection.id,
              gmailMessageId: message.id,
              threadId: message.threadId,
            })),
            skipDuplicates: true,
          })
        : { count: 0 };
      const storedMessages = referencesToProcess.length
        ? await transaction.gmailMessage.findMany({
            where: {
              connectionId: connection.id,
              gmailMessageId: {
                in: referencesToProcess.map((message) => message.id),
              },
            },
            select: { id: true, gmailMessageId: true },
          })
        : [];
      const messageIds = new Map(
        storedMessages.map((message) => [message.gmailMessageId, message.id]),
      );
      const reviewData = suggestions.flatMap((suggestion) => {
        const gmailMessageId = messageIds.get(suggestion.providerMessageId);
        if (!gmailMessageId) return [];
        const { providerMessageId: _providerMessageId, ...data } = suggestion;
        return [{ ...data, gmailMessageId, userId }];
      });
      const detected = reviewData.length
        ? await transaction.gmailUpdateReview.createMany({
            data: reviewData,
            skipDuplicates: true,
          })
        : { count: 0 };
      if (storedMessages.length) {
        await transaction.gmailMessage.updateMany({
          where: { id: { in: storedMessages.map((message) => message.id) } },
          data: {
            processedAt: now,
            classificationVersion: CURRENT_GMAIL_CLASSIFICATION_VERSION,
          },
        });
      }
      await transaction.gmailConnection.update({
        where: { id: connection.id },
        data: {
          encryptedCredentials: encryptJson(metadataResult.credentials),
          historyId: synchronization.historyId,
          lastSyncedAt: now,
        },
      });
      return { created: created.count, detected: detected.count };
    });

    return {
      synchronizationType: synchronization.fullSync ? "full" : "incremental",
      fetchedMessages: synchronization.messages.length,
      newMessages: result.created,
      duplicateMessages: synchronization.messages.length - result.created,
      analyzedMessages: metadataResult.messages.length,
      detectedUpdates: result.detected,
      lastSyncedAt: now.toISOString(),
    };
  },

  async updateSchedule(userId: string, input: UpdateGmailScheduleInput) {
    ensureConfigured();
    const connection = await prisma.gmailConnection.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!connection) throw new GmailNotConnectedError("Gmail is not connected");

    try {
      if (input.enabled) {
        await gmailSyncQueueService.schedule(userId, input.intervalMinutes);
      } else {
        await gmailSyncQueueService.unschedule(userId);
      }
    } catch {
      throw new GmailQueueUnavailableError("Automatic synchronization is temporarily unavailable");
    }

    await prisma.gmailConnection.update({
      where: { id: connection.id },
      data: {
        autoSyncEnabled: input.enabled,
        autoSyncIntervalMins: input.intervalMinutes,
        lastAutoSyncError: null,
      },
    });
    return this.status(userId);
  },

  async disconnect(userId: string) {
    const connection = await prisma.gmailConnection.findUnique({
      where: { userId },
      select: { encryptedCredentials: true },
    });

    if (connection) {
      try {
        const credentials = decryptJson<GmailCredentials>(
          connection.encryptedCredentials,
        );
        await gmailApiService.revoke(credentials);
      } catch {
        // Local disconnection must still succeed when Google has already revoked access.
      }
    }

    await gmailSyncQueueService.unschedule(userId).catch(() => {
      // Deleting the database connection makes any queued job a no-op.
    });
    await prisma.gmailConnection.deleteMany({ where: { userId } });
  },
};

function ensureConfigured() {
  if (!isGmailConfigured) {
    throw new GmailNotConfiguredError("Gmail integration is not configured");
  }
}
