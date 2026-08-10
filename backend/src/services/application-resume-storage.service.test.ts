import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  createPresignedPost: vi.fn(),
  getSignedUrl: vi.fn(),
  deleteMany: vi.fn(),
  updateMany: vi.fn(),
  findMany: vi.fn(),
  attachmentFindMany: vi.fn(),
  attachmentUpdateMany: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => {
  class S3Client {
    send = mocks.send;
  }
  class Command {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  return {
    S3Client,
    CopyObjectCommand: Command,
    DeleteObjectCommand: Command,
    GetObjectCommand: Command,
    HeadObjectCommand: Command,
    PutObjectCommand: Command,
  };
});

vi.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: mocks.createPresignedPost,
}));
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mocks.getSignedUrl,
}));
vi.mock("../config/application-resume-storage", () => ({
  applicationResumeStorageConfig: {
    bucket: "jatbucket2799",
    region: "us-east-1",
    enabled: true,
    uploadExpiresSeconds: 300,
  },
}));
vi.mock("../config/prisma", () => ({
  prisma: {
    resumeObjectDeletion: {
      deleteMany: mocks.deleteMany,
      updateMany: mocks.updateMany,
      findMany: mocks.findMany,
    },
    applicationResume: {
      findMany: mocks.attachmentFindMany,
      updateMany: mocks.attachmentUpdateMany,
    },
  },
}));

import { applicationResumeStorageService } from "./application-resume-storage.service";

describe("application resume S3 storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createPresignedPost.mockResolvedValue({
      url: "https://jatbucket2799.s3.amazonaws.com",
      fields: { key: "resumes/user-1/generated.pdf" },
    });
  });

  it("prepares a user-scoped upload with a five-megabyte policy", async () => {
    const result = await applicationResumeStorageService.prepareUpload(
      "user-1",
      {
        fileName: "resume.pdf",
        mimeType: "application/pdf",
        size: 1024,
      },
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.storageKey).toMatch(
      /^resumes\/pending\/user-1\/[0-9a-f-]{36}\.pdf$/,
    );
    expect(mocks.createPresignedPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        Bucket: "jatbucket2799",
        Key: result.data.storageKey,
        Expires: 300,
        Conditions: expect.arrayContaining([
          ["content-length-range", 1, 5 * 1024 * 1024],
          ["eq", "$Content-Type", "application/pdf"],
        ]),
      }),
    );
  });

  it("verifies S3 metadata and file signature before attachment", async () => {
    mocks.send
      .mockResolvedValueOnce({
        ContentLength: 2048,
        ContentType: "application/pdf",
      })
      .mockResolvedValueOnce({
        Body: {
          transformToByteArray: vi.fn().mockResolvedValue(
            Uint8Array.from(Buffer.from("%PDF-1.7")),
          ),
        },
      });

    const result = await applicationResumeStorageService.finalizeUpload(
      "user-1",
      "resumes/pending/user-1/12345678-1234-1234-1234-123456789abc.pdf",
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual({
      storageKey: expect.stringMatching(
        /^resumes\/active\/user-1\/[0-9a-f-]{36}\.pdf$/,
      ),
      extension: ".pdf",
      mimeType: "application/pdf",
      size: 2048,
    });
  });

  it("rejects storage keys outside the authenticated user's prefix", async () => {
    await expect(
      applicationResumeStorageService.finalizeUpload(
        "user-1",
        "resumes/pending/user-2/12345678-1234-1234-1234-123456789abc.pdf",
      ),
    ).resolves.toEqual({
      success: false,
      error: "Uploaded resume not found",
    });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("keeps failed deletion work queued for a later retry", async () => {
    mocks.send.mockRejectedValueOnce(new Error("S3 unavailable"));

    await expect(
      applicationResumeStorageService.processQueuedDeletion(
        "resumes/user-1/12345678-1234-1234-1234-123456789abc.pdf",
      ),
    ).resolves.toBe(false);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        storageKey:
          "resumes/user-1/12345678-1234-1234-1234-123456789abc.pdf",
      },
      data: { attempts: { increment: 1 }, lastError: "Error" },
    });
  });

  it("migrates a valid legacy attachment before clearing its database bytes", async () => {
    const content = Buffer.from("%PDF-1.7 legacy resume");
    mocks.attachmentFindMany.mockResolvedValue([
      {
        id: "resume-1",
        fileName: "Engineer_Acme.pdf",
        mimeType: "application/pdf",
        content,
        application: { userId: "user-1" },
      },
    ]);
    mocks.attachmentUpdateMany.mockResolvedValue({ count: 1 });
    mocks.send.mockResolvedValue({});

    await expect(
      applicationResumeStorageService.migrateLegacyAttachments(),
    ).resolves.toEqual({ migrated: 1, skipped: 0, failed: 0 });

    expect(mocks.attachmentUpdateMany).toHaveBeenCalledWith({
      where: { id: "resume-1", storageKey: null },
      data: {
        storageKey: expect.stringMatching(
          /^resumes\/active\/user-1\/[0-9a-f-]{36}\.pdf$/,
        ),
        content: null,
      },
    });
  });
});
