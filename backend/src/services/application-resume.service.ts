import { prisma } from "../config/prisma";
import type {
  ApplicationResumeExtension,
  ApplicationResumeUpload,
} from "../validators/application-resume.validator";

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
  upload: ApplicationResumeUpload,
) {
  return {
    fileName: buildApplicationResumeFileName(jobTitle, company, upload.extension),
    mimeType: upload.mimeType,
    size: upload.size,
    content: Uint8Array.from(upload.content),
  };
}

export const applicationResumeService = {
  findForApplication(userId: string, applicationId: string) {
    return prisma.applicationResume.findFirst({
      where: {
        applicationId,
        application: { userId },
      },
      select: {
        fileName: true,
        mimeType: true,
        size: true,
        content: true,
      },
    });
  },
};
