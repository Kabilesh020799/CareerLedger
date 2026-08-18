import path from "node:path";
import { z } from "zod";

export const applicationCoverLetterMaxBytes = 5 * 1024 * 1024;

const coverLetterTypes = {
  ".pdf": { mimeType: "application/pdf", hasSignature: (value: Buffer) => value.subarray(0, 5).toString() === "%PDF-" },
  ".doc": { mimeType: "application/msword", hasSignature: (value: Buffer) => value.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) },
  ".docx": { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", hasSignature: (value: Buffer) => value.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) },
} as const;

export type ApplicationCoverLetterExtension = keyof typeof coverLetterTypes;
export type ApplicationCoverLetterUpload = { content: Buffer; extension: ApplicationCoverLetterExtension; mimeType: (typeof coverLetterTypes)[ApplicationCoverLetterExtension]["mimeType"]; size: number };
export type StoredApplicationCoverLetterUpload = Omit<ApplicationCoverLetterUpload, "content"> & { storageKey: string };
export type ApplicationCoverLetterAttachmentInput = ApplicationCoverLetterUpload | StoredApplicationCoverLetterUpload;
export type CoverLetterUploadFile = Pick<Express.Multer.File, "buffer" | "mimetype" | "originalname" | "size">;

export function validateApplicationCoverLetterMetadata(fileName: string, mimeType: string) {
  const extension = path.extname(fileName).toLowerCase();
  if (!(extension in coverLetterTypes)) return { success: false as const, error: "Cover letter must be a PDF, DOC, or DOCX file" };
  const typedExtension = extension as ApplicationCoverLetterExtension;
  const expected = coverLetterTypes[typedExtension];
  if (mimeType !== expected.mimeType) return { success: false as const, error: "Cover letter contents must match its PDF, DOC, or DOCX file type" };
  return { success: true as const, data: { extension: typedExtension, mimeType: expected.mimeType } };
}

export function validateApplicationCoverLetter(file: CoverLetterUploadFile | undefined) {
  if (!file) return { success: true as const, data: undefined };
  if (file.size === 0) return { success: false as const, error: "Cover letter file cannot be empty" };
  if (file.size > applicationCoverLetterMaxBytes) return { success: false as const, error: "Cover letter must be 5 MB or smaller" };
  const metadata = validateApplicationCoverLetterMetadata(file.originalname, file.mimetype);
  if (!metadata.success) return metadata;
  if (!coverLetterTypes[metadata.data.extension].hasSignature(file.buffer)) return { success: false as const, error: "Cover letter contents must match its PDF, DOC, or DOCX file type" };
  return { success: true as const, data: { content: file.buffer, extension: metadata.data.extension, mimeType: metadata.data.mimeType, size: file.size } };
}

export const createApplicationCoverLetterUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(255),
  size: z.number().int().min(1, "Cover letter file cannot be empty").max(applicationCoverLetterMaxBytes, "Cover letter must be 5 MB or smaller"),
});
export const applicationCoverLetterUploadKeySchema = z.object({ storageKey: z.string().trim().min(1).max(500) });
export type CreateApplicationCoverLetterUploadInput = z.infer<typeof createApplicationCoverLetterUploadSchema>;
