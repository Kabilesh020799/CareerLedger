"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gmailService = exports.GmailNotConnectedError = exports.GmailNotConfiguredError = void 0;
const node_crypto_1 = require("node:crypto");
const gmail_1 = require("../config/gmail");
const prisma_1 = require("../config/prisma");
const encrypted_json_1 = require("../utils/encrypted-json");
const gmail_api_service_1 = require("./gmail-api.service");
class GmailNotConfiguredError extends Error {
}
exports.GmailNotConfiguredError = GmailNotConfiguredError;
class GmailNotConnectedError extends Error {
}
exports.GmailNotConnectedError = GmailNotConnectedError;
exports.gmailService = {
    async status(userId) {
        if (!gmail_1.isGmailConfigured) {
            return {
                configured: false,
                connected: false,
                gmailEmail: null,
                lastSyncedAt: null,
                synchronizedMessages: 0,
            };
        }
        const connection = await prisma_1.prisma.gmailConnection.findUnique({
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
    beginAuthorization(loginHint) {
        ensureConfigured();
        const state = (0, node_crypto_1.randomBytes)(32).toString("base64url");
        return {
            state,
            authorizationUrl: gmail_api_service_1.gmailApiService.authorizationUrl(state, loginHint),
        };
    },
    async completeAuthorization(userId, code) {
        ensureConfigured();
        const exchangedCredentials = await gmail_api_service_1.gmailApiService.exchangeAuthorizationCode(code);
        const profile = await gmail_api_service_1.gmailApiService.profile(exchangedCredentials);
        const encryptedCredentials = (0, encrypted_json_1.encryptJson)(profile.credentials);
        await prisma_1.prisma.$transaction(async (transaction) => {
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
            const changedAccount = existing.gmailEmail.toLocaleLowerCase("en-US") !==
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
    async synchronize(userId, now = new Date()) {
        ensureConfigured();
        const connection = await prisma_1.prisma.gmailConnection.findUnique({
            where: { userId },
            select: {
                id: true,
                encryptedCredentials: true,
                historyId: true,
            },
        });
        if (!connection)
            throw new GmailNotConnectedError("Gmail is not connected");
        const credentials = (0, encrypted_json_1.decryptJson)(connection.encryptedCredentials);
        const synchronization = await gmail_api_service_1.gmailApiService.synchronize(credentials, connection.historyId);
        const result = await prisma_1.prisma.$transaction(async (transaction) => {
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
                    encryptedCredentials: (0, encrypted_json_1.encryptJson)(synchronization.credentials),
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
    async disconnect(userId) {
        const connection = await prisma_1.prisma.gmailConnection.findUnique({
            where: { userId },
            select: { encryptedCredentials: true },
        });
        if (connection) {
            try {
                const credentials = (0, encrypted_json_1.decryptJson)(connection.encryptedCredentials);
                await gmail_api_service_1.gmailApiService.revoke(credentials);
            }
            catch {
                // Local disconnection must still succeed when Google has already revoked access.
            }
        }
        await prisma_1.prisma.gmailConnection.deleteMany({ where: { userId } });
    },
};
function ensureConfigured() {
    if (!gmail_1.isGmailConfigured) {
        throw new GmailNotConfiguredError("Gmail integration is not configured");
    }
}
