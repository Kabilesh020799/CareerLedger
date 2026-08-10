"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gmailService = exports.GmailNotConnectedError = exports.GmailNotConfiguredError = void 0;
const node_crypto_1 = require("node:crypto");
const gmail_1 = require("../config/gmail");
const prisma_1 = require("../config/prisma");
const encrypted_json_1 = require("../utils/encrypted-json");
const gmail_api_service_1 = require("./gmail-api.service");
const gmail_update_review_service_1 = require("./gmail-update-review.service");
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
        const [existingMessages, unprocessedMessages] = await Promise.all([
            synchronization.messages.length
                ? prisma_1.prisma.gmailMessage.findMany({
                    where: {
                        connectionId: connection.id,
                        gmailMessageId: {
                            in: synchronization.messages.map((message) => message.id),
                        },
                    },
                    select: { gmailMessageId: true },
                })
                : [],
            prisma_1.prisma.gmailMessage.findMany({
                where: { connectionId: connection.id, processedAt: null },
                select: { gmailMessageId: true, threadId: true },
                orderBy: { createdAt: "asc" },
                take: 100,
            }),
        ]);
        const existingIds = new Set(existingMessages.map((message) => message.gmailMessageId));
        const newReferences = synchronization.messages.filter((message) => !existingIds.has(message.id));
        const referencesToProcess = [
            ...new Map([...unprocessedMessages.map((message) => ({
                    id: message.gmailMessageId,
                    threadId: message.threadId,
                })), ...newReferences].map((message) => [message.id, message])).values(),
        ];
        const [metadataResult, applications] = referencesToProcess.length
            ? await Promise.all([
                gmail_api_service_1.gmailApiService.metadata(synchronization.credentials, referencesToProcess),
                prisma_1.prisma.application.findMany({
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
        const suggestions = metadataResult.messages
            .map((message) => (0, gmail_update_review_service_1.buildGmailUpdateSuggestion)(message, applications))
            .filter((suggestion) => suggestion !== null);
        const result = await prisma_1.prisma.$transaction(async (transaction) => {
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
            const messageIds = new Map(storedMessages.map((message) => [message.gmailMessageId, message.id]));
            const reviewData = suggestions.flatMap((suggestion) => {
                const gmailMessageId = messageIds.get(suggestion.providerMessageId);
                if (!gmailMessageId)
                    return [];
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
                    data: { processedAt: now },
                });
            }
            await transaction.gmailConnection.update({
                where: { id: connection.id },
                data: {
                    encryptedCredentials: (0, encrypted_json_1.encryptJson)(metadataResult.credentials),
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
