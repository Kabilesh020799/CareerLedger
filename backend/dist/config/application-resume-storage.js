"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationResumeStorageConfig = void 0;
function positiveInteger(value, fallback) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
const bucket = process.env.RESUME_BUCKET?.trim() ?? "";
const region = process.env.AWS_REGION?.trim() ||
    process.env.AWS_DEFAULT_REGION?.trim() ||
    "us-east-1";
exports.applicationResumeStorageConfig = {
    bucket,
    region,
    enabled: bucket.length > 0,
    uploadExpiresSeconds: Math.min(positiveInteger(process.env.RESUME_UPLOAD_EXPIRES_SECONDS, 300), 900),
};
