import { prisma } from "../config/prisma";
import type {
  ApplicationResumeAttachmentInput,
  ApplicationResumeExtension,
} from "../validators/application-resume.validator";
import { applicationResumeStorageService } from "./application-resume-storage.service";
import { applicationAccess } from "./workspace-access.service";

const maxNameSegmentLength = 80;

function fileNameSegment(value: string, fallback: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxNameSegmentLength)
    .replace(/_+$/g, "");

  return normalized || fallback;
}

export function buildApplicationResumeFileName(
  jobTitle: string,
  company: string,
  extension: ApplicationResumeExtension,
) {
  return `${fileNameSegment(jobTitle, "Role")}_${fileNameSegment(company, "Company")}${extension}`;
}

export function applicationResumeCreateData(
  jobTitle: string,
  company: string,
  upload: ApplicationResumeAttachmentInput,
) {
  return {
    fileName: buildApplicationResumeFileName(jobTitle, company, upload.extension),
    mimeType: upload.mimeType,
    size: upload.size,
    ...("content" in upload
      ? { content: Uint8Array.from(upload.content), storageKey: null }
      : { content: null, storageKey: upload.storageKey }),
  };
}

export const applicationResumeService = {
  async findForApplication(userId: string, applicationId: string, inline = false, workspaceId?: string) {
    const access = await applicationAccess(userId, workspaceId);
    const resume = await prisma.applicationResume.findFirst({
      where: {
        applicationId,
        application: access.where,
      },
      select: {
        fileName: true,
        mimeType: true,
        size: true,
        content: true,
        storageKey: true,
      },
    });

    if (!resume) return null;
    if (resume.storageKey) {
      return {
        kind: "s3" as const,
        fileName: resume.fileName,
        url: await applicationResumeStorageService.createDownloadUrl(
          resume.storageKey,
          resume.fileName,
          resume.mimeType,
          inline,
        ),
      };
    }
    if (!resume.content) return null;

    return {
      kind: "database" as const,
      fileName: resume.fileName,
      mimeType: resume.mimeType,
      size: resume.size,
      content: resume.content,
    };
  },
};
