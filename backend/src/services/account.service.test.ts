import { hash } from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  applicationResume: { findMany: vi.fn() },
  resumeObjectDeletion: { createMany: vi.fn() },
  session: { deleteMany: vi.fn() },
  $transaction: vi.fn(),
}));
const storageMock = vi.hoisted(() => ({ processQueuedDeletion: vi.fn() }));
const queueMock = vi.hoisted(() => ({ unschedule: vi.fn() }));

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));
vi.mock("./application-resume-storage.service", () => ({ applicationResumeStorageService: storageMock }));
vi.mock("./gmail-sync-queue.service", () => ({ gmailSyncQueueService: queueMock }));
vi.mock("./email.service", () => ({ emailService: { isAvailable: true } }));

import { AccountConfirmationError, accountService } from "./account.service";

describe("accountService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback: (transaction: typeof prismaMock) => unknown) => callback(prismaMock));
    queueMock.unschedule.mockResolvedValue(undefined);
    storageMock.processQueuedDeletion.mockResolvedValue(true);
  });

  it("updates only the account display name", async () => {
    prismaMock.user.update.mockResolvedValue({
      id: "user-1", username: "user", email: "user@example.com", name: "New Name", avatarUrl: null,
      emailVerifiedAt: null, passwordHash: "hash", googleId: null,
    });
    const profile = await accountService.updateProfile("user-1", { name: " New Name " });
    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "user-1" }, data: { name: "New Name" },
    }));
    expect(profile).not.toHaveProperty("passwordHash");
  });

  it("rejects account deletion when the confirmation is wrong", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      email: "user@example.com", passwordHash: await hash("CorrectPassword1", 4),
    });
    await expect(accountService.deleteAccount("user-1", {
      email: "user@example.com", password: "WrongPassword1",
    })).rejects.toBeInstanceOf(AccountConfirmationError);
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  it("queues owned S3 resumes before deleting the user and cleans up best effort", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ email: "user@example.com", passwordHash: null });
    prismaMock.applicationResume.findMany.mockResolvedValue([{ storageKey: "resumes/active/user-1/file.pdf" }, { storageKey: null }]);
    prismaMock.resumeObjectDeletion.createMany.mockResolvedValue({ count: 1 });
    prismaMock.session.deleteMany.mockResolvedValue({ count: 2 });
    prismaMock.user.delete.mockResolvedValue({});

    await accountService.deleteAccount("user-1", { email: "user@example.com" });

    expect(prismaMock.resumeObjectDeletion.createMany).toHaveBeenCalledWith({
      data: [{ storageKey: "resumes/active/user-1/file.pdf" }],
      skipDuplicates: true,
    });
    expect(prismaMock.resumeObjectDeletion.createMany).toHaveBeenCalledBefore(prismaMock.user.delete);
    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(queueMock.unschedule).toHaveBeenCalledWith("user-1");
    expect(storageMock.processQueuedDeletion).toHaveBeenCalledWith("resumes/active/user-1/file.pdf");
  });
});
