import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  gmailConnection: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
}));
const gmailServiceMock = vi.hoisted(() => ({ synchronize: vi.fn() }));

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));
vi.mock("./gmail.service", () => ({
  gmailService: gmailServiceMock,
  GmailNotConfiguredError: class GmailNotConfiguredError extends Error {},
  GmailNotConnectedError: class GmailNotConnectedError extends Error {},
}));
vi.mock("./gmail-api.service", () => ({
  GmailAuthorizationRequiredError: class GmailAuthorizationRequiredError extends Error {},
}));

import { processGmailSyncJob } from "./gmail-sync-job.service";

describe("processGmailSyncJob", () => {
  beforeEach(() => vi.clearAllMocks());

  it("skips users whose automatic schedule was disabled", async () => {
    prismaMock.gmailConnection.findUnique.mockResolvedValue({ autoSyncEnabled: false });
    await processGmailSyncJob("user-1");
    expect(gmailServiceMock.synchronize).not.toHaveBeenCalled();
  });

  it("records a safe failure and rethrows so BullMQ retries", async () => {
    prismaMock.gmailConnection.findUnique.mockResolvedValue({ autoSyncEnabled: true });
    gmailServiceMock.synchronize.mockRejectedValue(new Error("provider secret"));

    await expect(
      processGmailSyncJob("user-1", "automatic", new Date("2026-08-10T12:00:00Z")),
    ).rejects.toThrow();
    expect(prismaMock.gmailConnection.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { lastAutoSyncError: "Automatic synchronization failed and will retry" },
    });
  });

  it("runs a manual job even when automatic synchronization is disabled", async () => {
    const result = { detectedUpdates: 1 };
    gmailServiceMock.synchronize.mockResolvedValue(result);

    await expect(processGmailSyncJob("user-1", "manual")).resolves.toBe(result);

    expect(prismaMock.gmailConnection.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.gmailConnection.update).not.toHaveBeenCalled();
    expect(gmailServiceMock.synchronize).toHaveBeenCalledWith("user-1", expect.any(Date));
  });
});
