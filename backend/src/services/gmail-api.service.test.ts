import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/gmail", () => ({
  gmailConfig: {
    clientId: "client-id",
    clientSecret: "client-secret",
    callbackUrl: "http://localhost:3000/api/gmail/callback",
    frontendUrl: "http://localhost:5173",
    initialMessageLimit: 100,
  },
  isGmailConfigured: true,
}));

import {
  gmailApiService,
  gmailMetadataScope,
  type GmailCredentials,
} from "./gmail-api.service";

const credentials: GmailCredentials = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresAt: Date.now() + 60_000,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("gmailApiService", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("creates an offline metadata-only authorization request with state", () => {
    const url = new URL(
      gmailApiService.authorizationUrl("secure-state", "user@example.com"),
    );

    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(url.searchParams.get("scope")).toBe(gmailMetadataScope);
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("state")).toBe("secure-state");
    expect(url.searchParams.get("login_hint")).toBe("user@example.com");
  });

  it("exchanges a code only when Gmail metadata access was granted", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 3600,
        scope: gmailMetadataScope,
      }),
    );

    await expect(
      gmailApiService.exchangeAuthorizationCode("authorization-code"),
    ).resolves.toMatchObject({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
  });

  it("performs an initial sync of recent message references", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          messages: [
            { id: "message-1", threadId: "thread-1" },
            { id: "message-1", threadId: "thread-1" },
            { id: "message-2" },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: "message-1", historyId: "100" }));

    const result = await gmailApiService.synchronize(credentials, null);

    expect(result).toEqual({
      credentials,
      historyId: "100",
      messages: [
        { id: "message-1", threadId: "thread-1" },
        { id: "message-2", threadId: null },
      ],
      fullSync: true,
    });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain(
      "/messages?maxResults=100",
    );
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toContain(
      "/messages/message-1?format=minimal",
    );
  });

  it("paginates incremental message-added history and deduplicates references", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          history: [
            {
              messagesAdded: [
                { message: { id: "message-1", threadId: "thread-1" } },
              ],
            },
          ],
          historyId: "110",
          nextPageToken: "next-page",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          history: [
            {
              messagesAdded: [
                { message: { id: "message-1", threadId: "thread-1" } },
                { message: { id: "message-2", threadId: "thread-2" } },
              ],
            },
          ],
          historyId: "120",
        }),
      );

    const result = await gmailApiService.synchronize(credentials, "100");

    expect(result).toMatchObject({
      historyId: "120",
      messages: [
        { id: "message-1", threadId: "thread-1" },
        { id: "message-2", threadId: "thread-2" },
      ],
      fullSync: false,
    });
    const secondUrl = String(vi.mocked(fetch).mock.calls[1]?.[0]);
    expect(secondUrl).toContain("startHistoryId=100");
    expect(secondUrl).toContain("pageToken=next-page");
  });

  it("falls back to a full sync when Gmail expires the history identifier", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ error: "history expired" }, 404))
      .mockResolvedValueOnce(
        jsonResponse({ messages: [{ id: "message-3", threadId: "thread-3" }] }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: "message-3", historyId: "200" }));

    const result = await gmailApiService.synchronize(credentials, "100");

    expect(result).toMatchObject({
      historyId: "200",
      messages: [{ id: "message-3", threadId: "thread-3" }],
      fullSync: true,
    });
  });

  it("refreshes an expired access token before calling Gmail", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "new-access", expires_in: 3600 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ emailAddress: "user@example.com", historyId: "300" }),
      );

    const result = await gmailApiService.profile({
      ...credentials,
      expiresAt: 0,
    });

    expect(result.credentials).toMatchObject({
      accessToken: "new-access",
      refreshToken: "refresh-token",
    });
    expect(vi.mocked(fetch).mock.calls[1]?.[1]).toMatchObject({
      headers: { authorization: "Bearer new-access" },
    });
  });
});
