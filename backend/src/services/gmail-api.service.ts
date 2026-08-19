import { gmailConfig } from "../config/gmail";
import type { GmailMessageMetadata } from "./gmail-update-classifier";

const authorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
const tokenEndpoint = "https://oauth2.googleapis.com/token";
const revokeEndpoint = "https://oauth2.googleapis.com/revoke";
const gmailApiBaseUrl = "https://gmail.googleapis.com/gmail/v1/users/me";
const METADATA_REQUEST_CONCURRENCY = 20;
export const gmailMetadataScope =
  "https://www.googleapis.com/auth/gmail.metadata";

export type GmailCredentials = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type GmailMessageReference = {
  id: string;
  threadId: string | null;
};

export type GmailSynchronization = {
  credentials: GmailCredentials;
  historyId: string;
  messages: GmailMessageReference[];
  fullSync: boolean;
};

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

type GmailProfile = {
  emailAddress?: string;
  historyId?: string;
};

type GmailMessageList = {
  messages?: Array<{ id?: string; threadId?: string }>;
};

type GmailMessageResponse = {
  id?: string;
  threadId?: string;
  historyId?: string;
  internalDate?: string;
  snippet?: string;
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
  };
};

type GmailHistoryList = {
  history?: Array<{
    messagesAdded?: Array<{
      message?: { id?: string; threadId?: string };
    }>;
  }>;
  historyId?: string;
  nextPageToken?: string;
};

export class GmailApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export class GmailAuthorizationRequiredError extends Error {}

export const gmailApiService = {
  authorizationUrl(state: string, loginHint: string) {
    const parameters = new URLSearchParams({
      access_type: "offline",
      client_id: requireConfig(gmailConfig.clientId),
      include_granted_scopes: "true",
      login_hint: loginHint,
      prompt: "consent",
      redirect_uri: gmailConfig.callbackUrl,
      response_type: "code",
      scope: gmailMetadataScope,
      state,
    });
    return `${authorizationEndpoint}?${parameters.toString()}`;
  },

  async exchangeAuthorizationCode(code: string): Promise<GmailCredentials> {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: requireConfig(gmailConfig.clientId),
        client_secret: requireConfig(gmailConfig.clientSecret),
        code,
        grant_type: "authorization_code",
        redirect_uri: gmailConfig.callbackUrl,
      }),
    });
    const tokens = await readJson<TokenResponse>(response);
    if (
      !response.ok ||
      !tokens.access_token ||
      !tokens.refresh_token ||
      !tokens.expires_in ||
      !tokens.scope?.split(" ").includes(gmailMetadataScope)
    ) {
      throw new GmailAuthorizationRequiredError(
        "Google did not return reusable Gmail authorization",
      );
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };
  },

  async profile(credentials: GmailCredentials) {
    const currentCredentials = await refreshIfNeeded(credentials);
    const response = await gmailRequest<GmailProfile>(
      "/profile",
      currentCredentials.accessToken,
    );
    if (!response.emailAddress || !response.historyId) {
      throw new GmailApiError("Gmail profile response was incomplete", 502);
    }
    return {
      credentials: currentCredentials,
      emailAddress: response.emailAddress.toLowerCase(),
      historyId: response.historyId,
    };
  },

  async synchronize(
    credentials: GmailCredentials,
    historyId: string | null,
  ): Promise<GmailSynchronization> {
    const currentCredentials = await refreshIfNeeded(credentials);
    if (!historyId) return fullSynchronization(currentCredentials);

    try {
      return await incrementalSynchronization(currentCredentials, historyId);
    } catch (error) {
      if (error instanceof GmailApiError && error.status === 404) {
        return fullSynchronization(currentCredentials);
      }
      throw error;
    }
  },

  async metadata(
    credentials: GmailCredentials,
    messages: GmailMessageReference[],
  ): Promise<{ credentials: GmailCredentials; messages: GmailMessageMetadata[] }> {
    const currentCredentials = await refreshIfNeeded(credentials);
    const metadata = await mapWithConcurrency(
      messages,
      METADATA_REQUEST_CONCURRENCY,
      (message) => fetchMessageMetadata(currentCredentials.accessToken, message),
    );

    return { credentials: currentCredentials, messages: metadata };
  },

  async revoke(credentials: GmailCredentials) {
    const token = credentials.refreshToken || credentials.accessToken;
    await fetch(revokeEndpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
  },
};

async function fullSynchronization(
  credentials: GmailCredentials,
): Promise<GmailSynchronization> {
  const messages = await gmailRequest<GmailMessageList>(
    `/messages?${new URLSearchParams({
      maxResults: String(gmailConfig.initialMessageLimit),
    })}`,
    credentials.accessToken,
  );
  const messageReferences = uniqueMessageReferences(messages.messages ?? []);
  let historyId: string | undefined;

  if (messageReferences[0]) {
    const newestMessage = await gmailRequest<GmailMessageResponse>(
      `/messages/${encodeURIComponent(messageReferences[0].id)}?format=minimal`,
      credentials.accessToken,
    );
    historyId = newestMessage.historyId;
  } else {
    const profile = await gmailRequest<GmailProfile>(
      "/profile",
      credentials.accessToken,
    );
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

async function fetchMessageMetadata(
  accessToken: string,
  reference: GmailMessageReference,
): Promise<GmailMessageMetadata> {
  const parameters = new URLSearchParams({ format: "metadata" });
  for (const header of ["Subject", "From", "Date"]) {
    parameters.append("metadataHeaders", header);
  }
  const message = await gmailRequest<GmailMessageResponse>(
    `/messages/${encodeURIComponent(reference.id)}?${parameters}`,
    accessToken,
  );
  const headers = new Map(
    (message.payload?.headers ?? [])
      .filter((header) => header.name && header.value)
      .map((header) => [header.name!.toLocaleLowerCase("en-US"), header.value!]),
  );

  return {
    id: reference.id,
    threadId: message.threadId ?? reference.threadId,
    subject: truncate(headers.get("subject") ?? "(No subject)", 500),
    sender: truncate(headers.get("from") ?? "Unknown sender", 320),
    receivedAt: parseMessageDate(message.internalDate, headers.get("date")),
    snippet: truncate(message.snippet ?? "", 2_000),
  };
}

function parseMessageDate(internalDate?: string, dateHeader?: string) {
  const milliseconds = internalDate ? Number(internalDate) : Number.NaN;
  const date = Number.isFinite(milliseconds)
    ? new Date(milliseconds)
    : dateHeader
      ? new Date(dateHeader)
      : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function truncate(value: string, maximum: number) {
  return value.trim().slice(0, maximum);
}

async function incrementalSynchronization(
  credentials: GmailCredentials,
  startHistoryId: string,
): Promise<GmailSynchronization> {
  const references: Array<{ id?: string; threadId?: string }> = [];
  let pageToken: string | undefined;
  let historyId = startHistoryId;

  do {
    const parameters = new URLSearchParams({
      historyTypes: "messageAdded",
      maxResults: "500",
      startHistoryId,
    });
    if (pageToken) parameters.set("pageToken", pageToken);

    const page = await gmailRequest<GmailHistoryList>(
      `/history?${parameters}`,
      credentials.accessToken,
    );
    for (const history of page.history ?? []) {
      for (const added of history.messagesAdded ?? []) {
        if (added.message) references.push(added.message);
      }
    }
    if (page.historyId) historyId = page.historyId;
    pageToken = page.nextPageToken;
  } while (pageToken);

  return {
    credentials,
    historyId,
    messages: uniqueMessageReferences(references),
    fullSync: false,
  };
}

async function refreshIfNeeded(
  credentials: GmailCredentials,
): Promise<GmailCredentials> {
  if (credentials.expiresAt > Date.now() + 30_000) return credentials;

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireConfig(gmailConfig.clientId),
      client_secret: requireConfig(gmailConfig.clientSecret),
      grant_type: "refresh_token",
      refresh_token: credentials.refreshToken,
    }),
  });
  const tokens = await readJson<TokenResponse>(response);
  if (!response.ok || !tokens.access_token || !tokens.expires_in) {
    throw new GmailAuthorizationRequiredError(
      "Stored Gmail authorization is no longer valid",
    );
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? credentials.refreshToken,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };
}

async function gmailRequest<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${gmailApiBaseUrl}${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const body = await readJson<T>(response);
  if (response.status === 401) {
    throw new GmailAuthorizationRequiredError(
      "Stored Gmail authorization is no longer valid",
    );
  }
  if (!response.ok) {
    throw new GmailApiError("Gmail request failed", response.status);
  }
  return body;
}

async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

function uniqueMessageReferences(
  messages: Array<{ id?: string; threadId?: string }>,
) {
  const uniqueMessages = new Map<string, GmailMessageReference>();
  for (const message of messages) {
    if (!message.id || uniqueMessages.has(message.id)) continue;
    uniqueMessages.set(message.id, {
      id: message.id,
      threadId: message.threadId ?? null,
    });
  }
  return [...uniqueMessages.values()];
}

function requireConfig(value: string | undefined) {
  if (!value) throw new Error("Gmail integration is not configured");
  return value;
}

async function mapWithConcurrency<T, TResult>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<TResult>,
) {
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await mapper(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}
