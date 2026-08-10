import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  gmailConnection: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  gmailMessage: {
    createMany: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  gmailUpdateReview: {
    createMany: vi.fn(),
  },
  application: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const gmailApiMock = vi.hoisted(() => ({
  authorizationUrl: vi.fn(),
  exchangeAuthorizationCode: vi.fn(),
  profile: vi.fn(),
  synchronize: vi.fn(),
  metadata: vi.fn(),
  revoke: vi.fn(),
}));

vi.mock("../config/gmail", () => ({ isGmailConfigured: true }));
vi.mock("../config/prisma", () => ({ prisma: prismaMock }));
vi.mock("./gmail-api.service", () => ({ gmailApiService: gmailApiMock }));

import { GmailNotConnectedError, gmailService } from "./gmail.service";
import { encryptJson } from "../utils/encrypted-json";

const credentials = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresAt: 9999999999999,
};

describe("gmailService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.gmailMessage.findMany.mockResolvedValue([]);
    prismaMock.application.findMany.mockResolvedValue([]);
    prismaMock.gmailUpdateReview.createMany.mockResolvedValue({ count: 0 });
    prismaMock.$transaction.mockImplementation(async (operation) =>
      typeof operation === "function" ? operation(prismaMock) : Promise.all(operation),
    );
  });

  it("returns private user-scoped connection status without credentials", async () => {
    prismaMock.gmailConnection.findUnique.mockResolvedValue({
      gmailEmail: "user@example.com",
      lastSyncedAt: new Date("2026-08-09T20:00:00.000Z"),
      _count: { messages: 12 },
    });

    await expect(gmailService.status("user-1")).resolves.toEqual({
      configured: true,
      connected: true,
      gmailEmail: "user@example.com",
      lastSyncedAt: "2026-08-09T20:00:00.000Z",
      synchronizedMessages: 12,
    });
    expect(prismaMock.gmailConnection.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: {
        gmailEmail: true,
        lastSyncedAt: true,
        _count: { select: { messages: true } },
      },
    });
  });

  it("creates non-guessable authorization state for the signed-in email", () => {
    gmailApiMock.authorizationUrl.mockReturnValue("https://accounts.google.test");

    const result = gmailService.beginAuthorization("user@example.com");

    expect(result.state).toHaveLength(43);
    expect(gmailApiMock.authorizationUrl).toHaveBeenCalledWith(
      result.state,
      "user@example.com",
    );
  });

  it("encrypts credentials and creates a new Gmail connection", async () => {
    gmailApiMock.exchangeAuthorizationCode.mockResolvedValue(credentials);
    gmailApiMock.profile.mockResolvedValue({
      credentials,
      emailAddress: "gmail@example.com",
      historyId: "100",
    });
    prismaMock.gmailConnection.findUnique.mockResolvedValue(null);

    await expect(
      gmailService.completeAuthorization("user-1", "authorization-code"),
    ).resolves.toEqual({ gmailEmail: "gmail@example.com" });

    const createData = prismaMock.gmailConnection.create.mock.calls[0]?.[0].data;
    expect(createData).toMatchObject({
      userId: "user-1",
      gmailEmail: "gmail@example.com",
    });
    expect(createData.encryptedCredentials).toMatch(/^v1\./);
    expect(createData.encryptedCredentials).not.toContain("access-token");
    expect(createData).not.toHaveProperty("historyId");
  });

  it("clears prior sync state when a different Gmail account is connected", async () => {
    gmailApiMock.exchangeAuthorizationCode.mockResolvedValue(credentials);
    gmailApiMock.profile.mockResolvedValue({
      credentials,
      emailAddress: "new@example.com",
      historyId: "200",
    });
    prismaMock.gmailConnection.findUnique.mockResolvedValue({
      id: "connection-1",
      gmailEmail: "old@example.com",
    });

    await gmailService.completeAuthorization("user-1", "authorization-code");

    expect(prismaMock.gmailMessage.deleteMany).toHaveBeenCalledWith({
      where: { connectionId: "connection-1" },
    });
    expect(prismaMock.gmailConnection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "connection-1" },
        data: expect.objectContaining({
          gmailEmail: "new@example.com",
          historyId: null,
          lastSyncedAt: null,
        }),
      }),
    );
  });

  it("saves message references and advances the cursor only after a successful sync", async () => {
    prismaMock.gmailConnection.findUnique.mockResolvedValue({
      id: "connection-1",
      encryptedCredentials: encryptJson(credentials),
      historyId: "100",
    });
    gmailApiMock.synchronize.mockResolvedValue({
      credentials: { ...credentials, accessToken: "refreshed-access" },
      historyId: "120",
      messages: [
        { id: "message-1", threadId: "thread-1" },
        { id: "message-2", threadId: null },
      ],
      fullSync: false,
    });
    gmailApiMock.metadata.mockResolvedValue({
      credentials: { ...credentials, accessToken: "refreshed-access" },
      messages: [
        {
          id: "message-1",
          threadId: "thread-1",
          subject: "Interview invitation",
          sender: "Acme Recruiting <jobs@acme.com>",
          receivedAt: new Date("2026-08-09T20:00:00.000Z"),
          snippet: "Please schedule an interview.",
        },
        {
          id: "message-2",
          threadId: null,
          subject: "Monthly statement",
          sender: "bank@example.com",
          receivedAt: new Date("2026-08-09T20:00:00.000Z"),
          snippet: "Your statement is ready.",
        },
      ],
    });
    prismaMock.gmailMessage.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "stored-message-1", gmailMessageId: "message-1" },
        { id: "stored-message-2", gmailMessageId: "message-2" },
      ]);
    prismaMock.gmailMessage.createMany.mockResolvedValue({ count: 1 });
    prismaMock.gmailUpdateReview.createMany.mockResolvedValue({ count: 1 });

    const result = await gmailService.synchronize(
      "user-1",
      new Date("2026-08-09T21:00:00.000Z"),
    );

    expect(gmailApiMock.synchronize).toHaveBeenCalledWith(credentials, "100");
    expect(gmailApiMock.metadata).toHaveBeenCalledWith(
      { ...credentials, accessToken: "refreshed-access" },
      [
        { id: "message-1", threadId: "thread-1" },
        { id: "message-2", threadId: null },
      ],
    );
    expect(prismaMock.gmailMessage.createMany).toHaveBeenCalledWith({
      data: [
        {
          connectionId: "connection-1",
          gmailMessageId: "message-1",
          threadId: "thread-1",
        },
        {
          connectionId: "connection-1",
          gmailMessageId: "message-2",
          threadId: null,
        },
      ],
      skipDuplicates: true,
    });
    expect(result).toEqual({
      synchronizationType: "incremental",
      fetchedMessages: 2,
      newMessages: 1,
      duplicateMessages: 1,
      analyzedMessages: 2,
      detectedUpdates: 1,
      lastSyncedAt: "2026-08-09T21:00:00.000Z",
    });
    expect(prismaMock.gmailUpdateReview.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: "user-1",
          gmailMessageId: "stored-message-1",
          suggestedStatus: "INTERVIEW",
          subject: "Interview invitation",
          sender: "Acme Recruiting <jobs@acme.com>",
        }),
      ],
      skipDuplicates: true,
    });
    expect(prismaMock.gmailMessage.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["stored-message-1", "stored-message-2"] } },
      data: { processedAt: new Date("2026-08-09T21:00:00.000Z") },
    });
    expect(prismaMock.gmailConnection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          historyId: "120",
          lastSyncedAt: new Date("2026-08-09T21:00:00.000Z"),
        }),
      }),
    );
  });

  it("rejects synchronization without the user's own connection", async () => {
    prismaMock.gmailConnection.findUnique.mockResolvedValue(null);

    await expect(gmailService.synchronize("user-2")).rejects.toBeInstanceOf(
      GmailNotConnectedError,
    );
    expect(gmailApiMock.synchronize).not.toHaveBeenCalled();
  });

  it("analyzes previously synchronized message references once after upgrade", async () => {
    prismaMock.gmailConnection.findUnique.mockResolvedValue({
      id: "connection-1",
      encryptedCredentials: encryptJson(credentials),
      historyId: "120",
    });
    gmailApiMock.synchronize.mockResolvedValue({
      credentials,
      historyId: "120",
      messages: [],
      fullSync: false,
    });
    prismaMock.gmailMessage.findMany
      .mockResolvedValueOnce([
        { gmailMessageId: "legacy-message", threadId: "legacy-thread" },
      ])
      .mockResolvedValueOnce([
        { id: "stored-legacy", gmailMessageId: "legacy-message" },
      ]);
    gmailApiMock.metadata.mockResolvedValue({
      credentials,
      messages: [
        {
          id: "legacy-message",
          threadId: "legacy-thread",
          subject: "Coding assessment for Engineer",
          sender: "Acme <jobs@acme.com>",
          receivedAt: new Date("2026-08-08T12:00:00.000Z"),
          snippet: "Complete your coding assessment.",
        },
      ],
    });
    prismaMock.gmailUpdateReview.createMany.mockResolvedValue({ count: 1 });

    const result = await gmailService.synchronize("user-1");

    expect(gmailApiMock.metadata).toHaveBeenCalledWith(credentials, [
      { id: "legacy-message", threadId: "legacy-thread" },
    ]);
    expect(prismaMock.gmailMessage.createMany).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      fetchedMessages: 0,
      newMessages: 0,
      analyzedMessages: 1,
      detectedUpdates: 1,
    });
    expect(prismaMock.gmailMessage.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["stored-legacy"] } },
      data: { processedAt: expect.any(Date) },
    });
  });

  it("does not advance persisted state when Gmail synchronization fails", async () => {
    prismaMock.gmailConnection.findUnique.mockResolvedValue({
      id: "connection-1",
      encryptedCredentials: encryptJson(credentials),
      historyId: "100",
    });
    gmailApiMock.synchronize.mockRejectedValue(new Error("Gmail unavailable"));

    await expect(gmailService.synchronize("user-1")).rejects.toThrow(
      "Gmail unavailable",
    );
    expect(prismaMock.gmailMessage.createMany).not.toHaveBeenCalled();
    expect(prismaMock.gmailConnection.update).not.toHaveBeenCalled();
  });

  it("deletes local Gmail data even when token revocation fails", async () => {
    prismaMock.gmailConnection.findUnique.mockResolvedValue({
      encryptedCredentials: "invalid-or-revoked",
    });

    await gmailService.disconnect("user-1");

    expect(prismaMock.gmailConnection.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });
});
