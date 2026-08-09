"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gmailApiService = exports.GmailAuthorizationRequiredError = exports.GmailApiError = exports.gmailMetadataScope = void 0;
const gmail_1 = require("../config/gmail");
const authorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
const tokenEndpoint = "https://oauth2.googleapis.com/token";
const revokeEndpoint = "https://oauth2.googleapis.com/revoke";
const gmailApiBaseUrl = "https://gmail.googleapis.com/gmail/v1/users/me";
exports.gmailMetadataScope = "https://www.googleapis.com/auth/gmail.metadata";
class GmailApiError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
exports.GmailApiError = GmailApiError;
class GmailAuthorizationRequiredError extends Error {
}
exports.GmailAuthorizationRequiredError = GmailAuthorizationRequiredError;
exports.gmailApiService = {
    authorizationUrl(state, loginHint) {
        const parameters = new URLSearchParams({
            access_type: "offline",
            client_id: requireConfig(gmail_1.gmailConfig.clientId),
            include_granted_scopes: "true",
            login_hint: loginHint,
            prompt: "consent",
            redirect_uri: gmail_1.gmailConfig.callbackUrl,
            response_type: "code",
            scope: exports.gmailMetadataScope,
            state,
        });
        return `${authorizationEndpoint}?${parameters.toString()}`;
    },
    async exchangeAuthorizationCode(code) {
        const response = await fetch(tokenEndpoint, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: requireConfig(gmail_1.gmailConfig.clientId),
                client_secret: requireConfig(gmail_1.gmailConfig.clientSecret),
                code,
                grant_type: "authorization_code",
                redirect_uri: gmail_1.gmailConfig.callbackUrl,
            }),
        });
        const tokens = await readJson(response);
        if (!response.ok ||
            !tokens.access_token ||
            !tokens.refresh_token ||
            !tokens.expires_in ||
            !tokens.scope?.split(" ").includes(exports.gmailMetadataScope)) {
            throw new GmailAuthorizationRequiredError("Google did not return reusable Gmail authorization");
        }
        return {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: Date.now() + tokens.expires_in * 1000,
        };
    },
    async profile(credentials) {
        const currentCredentials = await refreshIfNeeded(credentials);
        const response = await gmailRequest("/profile", currentCredentials.accessToken);
        if (!response.emailAddress || !response.historyId) {
            throw new GmailApiError("Gmail profile response was incomplete", 502);
        }
        return {
            credentials: currentCredentials,
            emailAddress: response.emailAddress.toLowerCase(),
            historyId: response.historyId,
        };
    },
    async synchronize(credentials, historyId) {
        const currentCredentials = await refreshIfNeeded(credentials);
        if (!historyId)
            return fullSynchronization(currentCredentials);
        try {
            return await incrementalSynchronization(currentCredentials, historyId);
        }
        catch (error) {
            if (error instanceof GmailApiError && error.status === 404) {
                return fullSynchronization(currentCredentials);
            }
            throw error;
        }
    },
    async revoke(credentials) {
        const token = credentials.refreshToken || credentials.accessToken;
        await fetch(revokeEndpoint, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ token }),
        });
    },
};
async function fullSynchronization(credentials) {
    const messages = await gmailRequest(`/messages?${new URLSearchParams({
        maxResults: String(gmail_1.gmailConfig.initialMessageLimit),
    })}`, credentials.accessToken);
    const messageReferences = uniqueMessageReferences(messages.messages ?? []);
    let historyId;
    if (messageReferences[0]) {
        const newestMessage = await gmailRequest(`/messages/${encodeURIComponent(messageReferences[0].id)}?format=minimal`, credentials.accessToken);
        historyId = newestMessage.historyId;
    }
    else {
        const profile = await gmailRequest("/profile", credentials.accessToken);
        historyId = profile.historyId;
    }
    if (!historyId) {
        throw new GmailApiError("Gmail synchronization response was incomplete", 502);
    }
    return {
        credentials,
        historyId,
        messages: messageReferences,
        fullSync: true,
    };
}
async function incrementalSynchronization(credentials, startHistoryId) {
    const references = [];
    let pageToken;
    let historyId = startHistoryId;
    do {
        const parameters = new URLSearchParams({
            historyTypes: "messageAdded",
            maxResults: "500",
            startHistoryId,
        });
        if (pageToken)
            parameters.set("pageToken", pageToken);
        const page = await gmailRequest(`/history?${parameters}`, credentials.accessToken);
        for (const history of page.history ?? []) {
            for (const added of history.messagesAdded ?? []) {
                if (added.message)
                    references.push(added.message);
            }
        }
        if (page.historyId)
            historyId = page.historyId;
        pageToken = page.nextPageToken;
    } while (pageToken);
    return {
        credentials,
        historyId,
        messages: uniqueMessageReferences(references),
        fullSync: false,
    };
}
async function refreshIfNeeded(credentials) {
    if (credentials.expiresAt > Date.now() + 30_000)
        return credentials;
    const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: requireConfig(gmail_1.gmailConfig.clientId),
            client_secret: requireConfig(gmail_1.gmailConfig.clientSecret),
            grant_type: "refresh_token",
            refresh_token: credentials.refreshToken,
        }),
    });
    const tokens = await readJson(response);
    if (!response.ok || !tokens.access_token || !tokens.expires_in) {
        throw new GmailAuthorizationRequiredError("Stored Gmail authorization is no longer valid");
    }
    return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? credentials.refreshToken,
        expiresAt: Date.now() + tokens.expires_in * 1000,
    };
}
async function gmailRequest(path, accessToken) {
    const response = await fetch(`${gmailApiBaseUrl}${path}`, {
        headers: { authorization: `Bearer ${accessToken}` },
    });
    const body = await readJson(response);
    if (response.status === 401) {
        throw new GmailAuthorizationRequiredError("Stored Gmail authorization is no longer valid");
    }
    if (!response.ok) {
        throw new GmailApiError("Gmail request failed", response.status);
    }
    return body;
}
async function readJson(response) {
    try {
        return (await response.json());
    }
    catch {
        return {};
    }
}
function uniqueMessageReferences(messages) {
    const uniqueMessages = new Map();
    for (const message of messages) {
        if (!message.id || uniqueMessages.has(message.id))
            continue;
        uniqueMessages.set(message.id, {
            id: message.id,
            threadId: message.threadId ?? null,
        });
    }
    return [...uniqueMessages.values()];
}
function requireConfig(value) {
    if (!value)
        throw new Error("Gmail integration is not configured");
    return value;
}
