import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { applicationResumeStorageConfig } from "../config/application-resume-storage";
import { prisma } from "../config/prisma";
import {
  applicationResumeMaxBytes,
  validateApplicationResume,
  validateApplicationResumeMetadata,
  type CreateApplicationResumeUploadInput,
  type StoredApplicationResumeUpload,
} from "../validators/application-resume.validator";

const s3 = new S3Client({ region: applicationResumeStorageConfig.region });

function requireStorageConfiguration() {
  if (!applicationResumeStorageConfig.enabled) {
    throw new Error("Application resume object storage is not configured");
  }
  return applicationResumeStorageConfig.bucket;
}

function storageKeyFor(
  state: "pending" | "active",
  userId: string,
  extension: string,
) {
  return `resumes/${state}/${userId}/${randomUUID()}${extension}`;
}

function isOwnedStorageKey(
  state: "pending" | "active",
  userId: string,
  storageKey: string,
) {
  const prefix = `resumes/${state}/${userId}/`;
  if (!storageKey.startsWith(prefix)) return false;

  const objectName = storageKey.slice(prefix.length);
  return /^[0-9a-f-]{36}\.(pdf|doc|docx)$/.test(objectName);
}

function statusCode(error: unknown) {
  if (typeof error !== "object" || error === null) return undefined;
  const metadata = "$metadata" in error ? error.$metadata : undefined;
  if (typeof metadata !== "object" || metadata === null) return undefined;
  return "httpStatusCode" in metadata ? metadata.httpStatusCode : undefined;
}

async function deleteObject(storageKey: string) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: requireStorageConfiguration(),
      Key: storageKey,
    }),
  );
}

export const applicationResumeStorageService = {
  isConfigured() {
    return applicationResumeStorageConfig.enabled;
  },

  async prepareUpload(userId: string, input: CreateApplicationResumeUploadInput) {
    const metadata = validateApplicationResumeMetadata(
      input.fileName,
      input.mimeType,
    );
    if (!metadata.success) return metadata;

    const bucket = requireStorageConfiguration();
    const storageKey = storageKeyFor(
      "pending",
      userId,
      metadata.data.extension,
    );
    const prepared = await createPresignedPost(s3, {
      Bucket: bucket,
      Key: storageKey,
      Expires: applicationResumeStorageConfig.uploadExpiresSeconds,
      Fields: {
        "Content-Type": metadata.data.mimeType,
        success_action_status: "204",
      },
      Conditions: [
        ["content-length-range", 1, applicationResumeMaxBytes],
        ["eq", "$Content-Type", metadata.data.mimeType],
        ["eq", "$success_action_status", "204"],
      ],
    });

    return {
      success: true as const,
      data: {
        mode: "s3" as const,
        storageKey,
        url: prepared.url,
        fields: prepared.fields,
        expiresAt: new Date(
          Date.now() + applicationResumeStorageConfig.uploadExpiresSeconds * 1000,
        ).toISOString(),
      },
    };
  },

  async finalizeUpload(userId: string, storageKey: string) {
    if (!isOwnedStorageKey("pending", userId, storageKey)) {
      return { success: false as const, error: "Uploaded resume not found" };
    }

    const bucket = requireStorageConfiguration();
    try {
      const head = await s3.send(
        new HeadObjectCommand({ Bucket: bucket, Key: storageKey }),
      );
      const size = head.ContentLength ?? 0;
      const mimeType = head.ContentType ?? "";
      const signature = await s3.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: storageKey,
          Range: "bytes=0-7",
        }),
      );
      const content = Buffer.from(
        (await signature.Body?.transformToByteArray()) ?? new Uint8Array(),
      );
      const validation = validateApplicationResume({
        originalname: path.basename(storageKey),
        mimetype: mimeType,
        size,
        buffer: content,
      });

      if (!validation.success || !validation.data) {
        return validation.success
          ? { success: false as const, error: "Uploaded resume not found" }
          : validation;
      }

      const upload: StoredApplicationResumeUpload = {
        storageKey: storageKeyFor(
          "active",
          userId,
          validation.data.extension,
        ),
        extension: validation.data.extension,
        mimeType: validation.data.mimeType,
        size: validation.data.size,
      };
      await s3.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${storageKey}`,
          Key: upload.storageKey,
          ContentType: upload.mimeType,
          MetadataDirective: "REPLACE",
          ServerSideEncryption: "AES256",
        }),
      );
      try {
        await deleteObject(storageKey);
      } catch {
        // A lifecycle rule removes pending objects if immediate cleanup fails.
      }
      return { success: true as const, data: upload };
    } catch (error) {
      if (statusCode(error) === 404) {
        return { success: false as const, error: "Uploaded resume not found" };
      }
      throw error;
    }
  },

  async abandonUpload(userId: string, storageKey: string) {
    if (!applicationResumeStorageConfig.enabled) return false;
    if (
      !isOwnedStorageKey("pending", userId, storageKey) &&
      !isOwnedStorageKey("active", userId, storageKey)
    ) {
      return false;
    }
    await deleteObject(storageKey);
    return true;
  },

  createDownloadUrl(storageKey: string, fileName: string, mimeType: string) {
    return getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: requireStorageConfiguration(),
        Key: storageKey,
        ResponseContentDisposition: `attachment; filename="${fileName}"`,
        ResponseContentType: mimeType,
      }),
      { expiresIn: applicationResumeStorageConfig.uploadExpiresSeconds },
    );
  },

  async processQueuedDeletion(storageKey: string) {
    if (!applicationResumeStorageConfig.enabled) return false;

    try {
      await deleteObject(storageKey);
      await prisma.resumeObjectDeletion.deleteMany({ where: { storageKey } });
      return true;
    } catch (error) {
      const lastError = error instanceof Error ? error.name : "UnknownError";
      await prisma.resumeObjectDeletion.updateMany({
        where: { storageKey },
        data: { attempts: { increment: 1 }, lastError },
      });
      return false;
    }
  },

  async retryQueuedDeletions() {
    if (!applicationResumeStorageConfig.enabled) return;
    const pending = await prisma.resumeObjectDeletion.findMany({
      select: { storageKey: true },
      orderBy: { createdAt: "asc" },
      take: 25,
    });
    await Promise.all(
      pending.map(({ storageKey }) =>
        applicationResumeStorageService.processQueuedDeletion(storageKey),
      ),
    );
  },

  async migrateLegacyAttachments() {
    if (!applicationResumeStorageConfig.enabled) {
      return { migrated: 0, skipped: 0, failed: 0 };
    }

    const attachments = await prisma.applicationResume.findMany({
      where: { storageKey: null, content: { not: null } },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        content: true,
        application: { select: { userId: true } },
      },
    });
    const counts = { migrated: 0, skipped: 0, failed: 0 };

    for (const attachment of attachments) {
      const userId = attachment.application.userId;
      if (!userId || !attachment.content) {
        counts.skipped += 1;
        continue;
      }

      const validation = validateApplicationResume({
        originalname: attachment.fileName,
        mimetype: attachment.mimeType,
        size: attachment.content.length,
        buffer: Buffer.from(attachment.content),
      });
      if (!validation.success || !validation.data) {
        counts.skipped += 1;
        continue;
      }

      const storageKey = storageKeyFor(
        "active",
        userId,
        validation.data.extension,
      );
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: requireStorageConfiguration(),
            Key: storageKey,
            Body: attachment.content,
            ContentType: validation.data.mimeType,
            ServerSideEncryption: "AES256",
          }),
        );
        const updated = await prisma.applicationResume.updateMany({
          where: { id: attachment.id, storageKey: null },
          data: { storageKey, content: null },
        });
        if (updated.count === 0) {
          await deleteObject(storageKey);
          counts.skipped += 1;
        } else {
          counts.migrated += 1;
        }
      } catch {
        counts.failed += 1;
      }
    }

    return counts;
  },
};
