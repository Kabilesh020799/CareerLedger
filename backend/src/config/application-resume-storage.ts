function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const bucket = process.env.RESUME_BUCKET?.trim() ?? "";
const region =
  process.env.AWS_REGION?.trim() ||
  process.env.AWS_DEFAULT_REGION?.trim() ||
  "us-east-1";

export const applicationResumeStorageConfig = {
  bucket,
  region,
  enabled: bucket.length > 0,
  uploadExpiresSeconds: Math.min(
    positiveInteger(process.env.RESUME_UPLOAD_EXPIRES_SECONDS, 300),
    900,
  ),
};
