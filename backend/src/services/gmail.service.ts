import { randomBytes } from "node:crypto";
import { isGmailConfigured } from "../config/gmail";
import { prisma } from "../config/prisma";
import { decryptJson, encryptJson } from "../utils/encrypted-json";
import {
  gmailApiService,
  type GmailCredentials,
} from "./gmail-api.service";

export class GmailNotConfiguredError extends Error {}
export class GmailNotConnectedError extends Error {}

export const gmailService = {
  async status(userId: string) {
    if (!isGmailConfigured) {
      return {
        configured: false,
        connected: false,
        gmailEmail: null,
        lastSyncedAt: null,
        synchronizedMessages: 0,
      };
    }

    const connection = await prisma.gmailConnection.findUnique({
      where: { userId },
      select: {
        gmailEmail: true,
        lastSyncedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return {
      configured: true,
      connected: Boolean(connection),
      gmailEmail: connection?.gmailEmail ?? null,
      lastSyncedAt: connection?.lastSyncedAt?.toISOString() ?? null,
      synchronizedMessages: connection?._count.messages ?? 0,
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

    const result = await prisma.$transaction(async (transaction) => {
      const created = synchronization.messages.length
        ? await transaction.gmailMessage.createMany({
            data: synchronization.messages.map((message) => ({
              connectionId: connection.id,
              gmailMessageId: message.id,
              threadId: message.threadId,
            })),
            skipDuplicates: true,
          })
        : { count: 0 };
      await transaction.gmailConnection.update({
        where: { id: connection.id },
        data: {
          encryptedCredentials: encryptJson(synchronization.credentials),
          historyId: synchronization.historyId,
          lastSyncedAt: now,
        },
      });
      return created;
    });

    return {
      synchronizationType: synchronization.fullSync ? "full" : "incremental",
      fetchedMessages: synchronization.messages.length,
      newMessages: result.count,
      duplicateMessages: synchronization.messages.length - result.count,
      lastSyncedAt: now.toISOString(),
    };
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

    await prisma.gmailConnection.deleteMany({ where: { userId } });
  },
};

function ensureConfigured() {
  if (!isGmailConfigured) {
    throw new GmailNotConfiguredError("Gmail integration is not configured");
  }
}
