import path from "node:path";
import { z } from "zod";

export const applicationResumeMaxBytes = 5 * 1024 * 1024;

const resumeTypes = {
  ".pdf": {
    mimeType: "application/pdf",
    hasSignature: (content: Buffer) => content.subarray(0, 5).toString() === "%PDF-",
  },
  ".doc": {
    mimeType: "application/msword",
    hasSignature: (content: Buffer) =>
      content.subarray(0, 8).equals(
        Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      ),
  },
  ".docx": {
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    hasSignature: (content: Buffer) =>
      content.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
  },
} as const;

export type ApplicationResumeExtension = keyof typeof resumeTypes;

export type ApplicationResumeUpload = {
  content: Buffer;
  extension: ApplicationResumeExtension;
  mimeType: (typeof resumeTypes)[ApplicationResumeExtension]["mimeType"];
  size: number;
};

export type StoredApplicationResumeUpload = Omit<
  ApplicationResumeUpload,
  "content"
> & {
  storageKey: string;
};

export type ApplicationResumeAttachmentInput =
  | ApplicationResumeUpload
  | StoredApplicationResumeUpload;

export type ResumeUploadFile = Pick<
  Express.Multer.File,
  "buffer" | "mimetype" | "originalname" | "size"
>;

export type ApplicationResumeValidationResult =
  | { success: true; data: ApplicationResumeUpload | undefined }
  | { success: false; error: string };

export type ApplicationResumeMetadataValidationResult =
  | {
      success: true;
      data: {
        extension: ApplicationResumeExtension;
        mimeType: ApplicationResumeUpload["mimeType"];
      };
    }
  | { success: false; error: string };

export function validateApplicationResumeMetadata(
  fileName: string,
  mimeType: string,
): ApplicationResumeMetadataValidationResult {
  const extension = path.extname(fileName).toLowerCase();
  if (!(extension in resumeTypes)) {
    return { success: false, error: "Resume must be a PDF, DOC, or DOCX file" };
  }

  const typedExtension = extension as ApplicationResumeExtension;
  const expectedType = resumeTypes[typedExtension];
  if (mimeType !== expectedType.mimeType) {
    return {
      success: false,
      error: "Resume contents must match its PDF, DOC, or DOCX file type",
    };
  }

  return {
    success: true,
    data: { extension: typedExtension, mimeType: expectedType.mimeType },
  };
}

export function validateApplicationResume(
  file: ResumeUploadFile | undefined,
): ApplicationResumeValidationResult {
  if (!file) return { success: true, data: undefined };

  const size = file.size;
  if (size === 0) {
    return { success: false, error: "Resume file cannot be empty" };
  }
  if (size > applicationResumeMaxBytes) {
    return { success: false, error: "Resume must be 5 MB or smaller" };
  }

  const metadata = validateApplicationResumeMetadata(
    file.originalname,
    file.mimetype,
  );
  if (!metadata.success) return metadata;

  const expectedType = resumeTypes[metadata.data.extension];
  if (!expectedType.hasSignature(file.buffer)) {
    return {
      success: false,
      error: "Resume contents must match its PDF, DOC, or DOCX file type",
    };
  }

  return {
    success: true,
    data: {
      content: file.buffer,
      extension: metadata.data.extension,
      mimeType: metadata.data.mimeType,
      size,
    },
  };
}

export const createApplicationResumeUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(255),
  size: z
    .number()
    .int()
    .min(1, "Resume file cannot be empty")
    .max(applicationResumeMaxBytes, "Resume must be 5 MB or smaller"),
});

export const applicationResumeUploadKeySchema = z.object({
  storageKey: z.string().trim().min(1).max(500),
});

export type CreateApplicationResumeUploadInput = z.infer<
  typeof createApplicationResumeUploadSchema
>;
