import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ send: vi.fn(), createPresignedPost: vi.fn(), getSignedUrl: vi.fn() }));
vi.mock("@aws-sdk/client-s3", () => {
  class S3Client { send = mocks.send; }
  class Command { constructor(public input: unknown) {} }
  return { S3Client, CopyObjectCommand: Command, DeleteObjectCommand: Command, GetObjectCommand: Command, HeadObjectCommand: Command };
});
vi.mock("@aws-sdk/s3-presigned-post", () => ({ createPresignedPost: mocks.createPresignedPost }));
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: mocks.getSignedUrl }));
vi.mock("../config/application-resume-storage", () => ({ applicationResumeStorageConfig: { bucket: "private-bucket", region: "us-east-1", enabled: true, uploadExpiresSeconds: 300 } }));

import { applicationCoverLetterStorageService } from "./application-cover-letter-storage.service";

describe("application cover-letter S3 storage", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.createPresignedPost.mockResolvedValue({ url: "https://private-bucket.s3.amazonaws.com", fields: {} }); });
  it("prepares a user-scoped pending object with a five-megabyte policy", async () => {
    const result = await applicationCoverLetterStorageService.prepareUpload("user-1", { fileName: "letter.pdf", mimeType: "application/pdf", size: 100 });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.storageKey).toMatch(/^resumes\/cover-letters\/pending\/user-1\/[0-9a-f-]{36}\.pdf$/);
    expect(mocks.createPresignedPost).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ Conditions: expect.arrayContaining([["content-length-range", 1, 5 * 1024 * 1024]]) }));
  });
  it("rejects another user's pending key without contacting S3", async () => {
    await expect(applicationCoverLetterStorageService.finalizeUpload("user-1", "resumes/cover-letters/pending/user-2/12345678-1234-1234-1234-123456789abc.pdf")).resolves.toEqual({ success: false, error: "Uploaded cover letter not found" });
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
