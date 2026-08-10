"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationResumeStorageService = void 0;
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_presigned_post_1 = require("@aws-sdk/s3-presigned-post");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const application_resume_storage_1 = require("../config/application-resume-storage");
const prisma_1 = require("../config/prisma");
const application_resume_validator_1 = require("../validators/application-resume.validator");
const s3 = new client_s3_1.S3Client({ region: application_resume_storage_1.applicationResumeStorageConfig.region });
function requireStorageConfiguration() {
    if (!application_resume_storage_1.applicationResumeStorageConfig.enabled) {
        throw new Error("Application resume object storage is not configured");
    }
    return application_resume_storage_1.applicationResumeStorageConfig.bucket;
}
function storageKeyFor(state, userId, extension) {
    return `resumes/${state}/${userId}/${(0, node_crypto_1.randomUUID)()}${extension}`;
}
function isOwnedStorageKey(state, userId, storageKey) {
    const prefix = `resumes/${state}/${userId}/`;
    if (!storageKey.startsWith(prefix))
        return false;
    const objectName = storageKey.slice(prefix.length);
    return /^[0-9a-f-]{36}\.(pdf|doc|docx)$/.test(objectName);
}
function statusCode(error) {
    if (typeof error !== "object" || error === null)
        return undefined;
    const metadata = "$metadata" in error ? error.$metadata : undefined;
    if (typeof metadata !== "object" || metadata === null)
        return undefined;
    return "httpStatusCode" in metadata ? metadata.httpStatusCode : undefined;
}
async function deleteObject(storageKey) {
    await s3.send(new client_s3_1.DeleteObjectCommand({
        Bucket: requireStorageConfiguration(),
        Key: storageKey,
    }));
}
exports.applicationResumeStorageService = {
    isConfigured() {
        return application_resume_storage_1.applicationResumeStorageConfig.enabled;
    },
    async prepareUpload(userId, input) {
        const metadata = (0, application_resume_validator_1.validateApplicationResumeMetadata)(input.fileName, input.mimeType);
        if (!metadata.success)
            return metadata;
        const bucket = requireStorageConfiguration();
        const storageKey = storageKeyFor("pending", userId, metadata.data.extension);
        const prepared = await (0, s3_presigned_post_1.createPresignedPost)(s3, {
            Bucket: bucket,
            Key: storageKey,
            Expires: application_resume_storage_1.applicationResumeStorageConfig.uploadExpiresSeconds,
            Fields: {
                "Content-Type": metadata.data.mimeType,
                success_action_status: "204",
            },
            Conditions: [
                ["content-length-range", 1, application_resume_validator_1.applicationResumeMaxBytes],
                ["eq", "$Content-Type", metadata.data.mimeType],
                ["eq", "$success_action_status", "204"],
            ],
        });
        return {
            success: true,
            data: {
                mode: "s3",
                storageKey,
                url: prepared.url,
                fields: prepared.fields,
                expiresAt: new Date(Date.now() + application_resume_storage_1.applicationResumeStorageConfig.uploadExpiresSeconds * 1000).toISOString(),
            },
        };
    },
    async finalizeUpload(userId, storageKey) {
        if (!isOwnedStorageKey("pending", userId, storageKey)) {
            return { success: false, error: "Uploaded resume not found" };
        }
        const bucket = requireStorageConfiguration();
        try {
            const head = await s3.send(new client_s3_1.HeadObjectCommand({ Bucket: bucket, Key: storageKey }));
            const size = head.ContentLength ?? 0;
            const mimeType = head.ContentType ?? "";
            const signature = await s3.send(new client_s3_1.GetObjectCommand({
                Bucket: bucket,
                Key: storageKey,
                Range: "bytes=0-7",
            }));
            const content = Buffer.from((await signature.Body?.transformToByteArray()) ?? new Uint8Array());
            const validation = (0, application_resume_validator_1.validateApplicationResume)({
                originalname: node_path_1.default.basename(storageKey),
                mimetype: mimeType,
                size,
                buffer: content,
            });
            if (!validation.success || !validation.data) {
                return validation.success
                    ? { success: false, error: "Uploaded resume not found" }
                    : validation;
            }
            const upload = {
                storageKey: storageKeyFor("active", userId, validation.data.extension),
                extension: validation.data.extension,
                mimeType: validation.data.mimeType,
                size: validation.data.size,
            };
            await s3.send(new client_s3_1.CopyObjectCommand({
                Bucket: bucket,
                CopySource: `${bucket}/${storageKey}`,
                Key: upload.storageKey,
                ContentType: upload.mimeType,
                MetadataDirective: "REPLACE",
                ServerSideEncryption: "AES256",
            }));
            try {
                await deleteObject(storageKey);
            }
            catch {
                // A lifecycle rule removes pending objects if immediate cleanup fails.
            }
            return { success: true, data: upload };
        }
        catch (error) {
            if (statusCode(error) === 404) {
                return { success: false, error: "Uploaded resume not found" };
            }
            throw error;
        }
    },
    async abandonUpload(userId, storageKey) {
        if (!application_resume_storage_1.applicationResumeStorageConfig.enabled)
            return false;
        if (!isOwnedStorageKey("pending", userId, storageKey) &&
            !isOwnedStorageKey("active", userId, storageKey)) {
            return false;
        }
        await deleteObject(storageKey);
        return true;
    },
    createDownloadUrl(storageKey, fileName, mimeType) {
        return (0, s3_request_presigner_1.getSignedUrl)(s3, new client_s3_1.GetObjectCommand({
            Bucket: requireStorageConfiguration(),
            Key: storageKey,
            ResponseContentDisposition: `attachment; filename="${fileName}"`,
            ResponseContentType: mimeType,
        }), { expiresIn: application_resume_storage_1.applicationResumeStorageConfig.uploadExpiresSeconds });
    },
    async processQueuedDeletion(storageKey) {
        if (!application_resume_storage_1.applicationResumeStorageConfig.enabled)
            return false;
        try {
            await deleteObject(storageKey);
            await prisma_1.prisma.resumeObjectDeletion.deleteMany({ where: { storageKey } });
            return true;
        }
        catch (error) {
            const lastError = error instanceof Error ? error.name : "UnknownError";
            await prisma_1.prisma.resumeObjectDeletion.updateMany({
                where: { storageKey },
                data: { attempts: { increment: 1 }, lastError },
            });
            return false;
        }
    },
    async retryQueuedDeletions() {
        if (!application_resume_storage_1.applicationResumeStorageConfig.enabled)
            return;
        const pending = await prisma_1.prisma.resumeObjectDeletion.findMany({
            select: { storageKey: true },
            orderBy: { createdAt: "asc" },
            take: 25,
        });
        await Promise.all(pending.map(({ storageKey }) => exports.applicationResumeStorageService.processQueuedDeletion(storageKey)));
    },
    async migrateLegacyAttachments() {
        if (!application_resume_storage_1.applicationResumeStorageConfig.enabled) {
            return { migrated: 0, skipped: 0, failed: 0 };
        }
        const attachments = await prisma_1.prisma.applicationResume.findMany({
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
            const validation = (0, application_resume_validator_1.validateApplicationResume)({
                originalname: attachment.fileName,
                mimetype: attachment.mimeType,
                size: attachment.content.length,
                buffer: Buffer.from(attachment.content),
            });
            if (!validation.success || !validation.data) {
                counts.skipped += 1;
                continue;
            }
            const storageKey = storageKeyFor("active", userId, validation.data.extension);
            try {
                await s3.send(new client_s3_1.PutObjectCommand({
                    Bucket: requireStorageConfiguration(),
                    Key: storageKey,
                    Body: attachment.content,
                    ContentType: validation.data.mimeType,
                    ServerSideEncryption: "AES256",
                }));
                const updated = await prisma_1.prisma.applicationResume.updateMany({
                    where: { id: attachment.id, storageKey: null },
                    data: { storageKey, content: null },
                });
                if (updated.count === 0) {
                    await deleteObject(storageKey);
                    counts.skipped += 1;
                }
                else {
                    counts.migrated += 1;
                }
            }
            catch {
                counts.failed += 1;
            }
        }
        return counts;
    },
};
