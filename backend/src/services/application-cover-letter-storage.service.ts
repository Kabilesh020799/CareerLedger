import path from "node:path";
import { randomUUID } from "node:crypto";
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { applicationResumeStorageConfig } from "../config/application-resume-storage";
import { applicationCoverLetterMaxBytes, validateApplicationCoverLetter, validateApplicationCoverLetterMetadata, type CreateApplicationCoverLetterUploadInput, type StoredApplicationCoverLetterUpload } from "../validators/application-cover-letter.validator";

const s3 = new S3Client({ region: applicationResumeStorageConfig.region });
const bucket = () => {
  if (!applicationResumeStorageConfig.enabled) throw new Error("Application attachment object storage is not configured");
  return applicationResumeStorageConfig.bucket;
};
const coverLetterPrefix = "resumes/cover-letters";
const keyFor = (state: "pending" | "active", userId: string, extension: string) => `${coverLetterPrefix}/${state}/${userId}/${randomUUID()}${extension}`;
const owned = (state: "pending" | "active", userId: string, key: string) => key.startsWith(`${coverLetterPrefix}/${state}/${userId}/`) && /^[0-9a-f-]{36}\.(pdf|doc|docx)$/.test(key.slice(`${coverLetterPrefix}/${state}/${userId}/`.length));
const remove = (key: string) => s3.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
const statusCode = (error: unknown) => typeof error === "object" && error !== null && "$metadata" in error && typeof error.$metadata === "object" && error.$metadata !== null && "httpStatusCode" in error.$metadata ? error.$metadata.httpStatusCode : undefined;

export const applicationCoverLetterStorageService = {
  isConfigured: () => applicationResumeStorageConfig.enabled,
  async prepareUpload(userId: string, input: CreateApplicationCoverLetterUploadInput) {
    const metadata = validateApplicationCoverLetterMetadata(input.fileName, input.mimeType);
    if (!metadata.success) return metadata;
    const storageKey = keyFor("pending", userId, metadata.data.extension);
    const prepared = await createPresignedPost(s3, { Bucket: bucket(), Key: storageKey, Expires: applicationResumeStorageConfig.uploadExpiresSeconds, Fields: { "Content-Type": metadata.data.mimeType, success_action_status: "204" }, Conditions: [["content-length-range", 1, applicationCoverLetterMaxBytes], ["eq", "$Content-Type", metadata.data.mimeType], ["eq", "$success_action_status", "204"]] });
    return { success: true as const, data: { mode: "s3" as const, storageKey, url: prepared.url, fields: prepared.fields, expiresAt: new Date(Date.now() + applicationResumeStorageConfig.uploadExpiresSeconds * 1000).toISOString() } };
  },
  async finalizeUpload(userId: string, storageKey: string) {
    if (!owned("pending", userId, storageKey)) return { success: false as const, error: "Uploaded cover letter not found" };
    try {
      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket(), Key: storageKey }));
      const signature = await s3.send(new GetObjectCommand({ Bucket: bucket(), Key: storageKey, Range: "bytes=0-7" }));
      const validation = validateApplicationCoverLetter({ originalname: path.basename(storageKey), mimetype: head.ContentType ?? "", size: head.ContentLength ?? 0, buffer: Buffer.from((await signature.Body?.transformToByteArray()) ?? new Uint8Array()) });
      if (!validation.success || !validation.data) return validation.success ? { success: false as const, error: "Uploaded cover letter not found" } : validation;
      const upload: StoredApplicationCoverLetterUpload = { storageKey: keyFor("active", userId, validation.data.extension), extension: validation.data.extension, mimeType: validation.data.mimeType, size: validation.data.size };
      await s3.send(new CopyObjectCommand({ Bucket: bucket(), CopySource: `${bucket()}/${storageKey}`, Key: upload.storageKey, ContentType: upload.mimeType, MetadataDirective: "REPLACE", ServerSideEncryption: "AES256" }));
      try { await remove(storageKey); } catch { /* lifecycle cleanup fallback */ }
      return { success: true as const, data: upload };
    } catch (error) {
      if (statusCode(error) === 404) return { success: false as const, error: "Uploaded cover letter not found" };
      throw error;
    }
  },
  async abandonUpload(userId: string, storageKey: string) {
    if (!applicationResumeStorageConfig.enabled || (!owned("pending", userId, storageKey) && !owned("active", userId, storageKey))) return false;
    await remove(storageKey);
    return true;
  },
  createDownloadUrl(storageKey: string, fileName: string, mimeType: string, inline = false) {
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket(), Key: storageKey, ResponseContentDisposition: `${inline ? "inline" : "attachment"}; filename="${fileName}"`, ResponseContentType: mimeType }), { expiresIn: applicationResumeStorageConfig.uploadExpiresSeconds });
  },
};
