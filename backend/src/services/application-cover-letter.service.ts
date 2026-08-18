import { prisma } from "../config/prisma";
import type { ApplicationCoverLetterAttachmentInput, ApplicationCoverLetterExtension } from "../validators/application-cover-letter.validator";
import { applicationCoverLetterStorageService } from "./application-cover-letter-storage.service";
import { applicationAccess } from "./workspace-access.service";

const segment = (value: string, fallback: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80).replace(/_+$/g, "") || fallback;
export const buildApplicationCoverLetterFileName = (role: string, company: string, extension: ApplicationCoverLetterExtension) => `${segment(role, "Role")}_${segment(company, "Company")}_Cover_Letter${extension}`;
export const applicationCoverLetterCreateData = (role: string, company: string, upload: ApplicationCoverLetterAttachmentInput) => ({ fileName: buildApplicationCoverLetterFileName(role, company, upload.extension), mimeType: upload.mimeType, size: upload.size, ...("content" in upload ? { content: Uint8Array.from(upload.content), storageKey: null } : { content: null, storageKey: upload.storageKey }) });

export const applicationCoverLetterService = {
  async findForApplication(userId: string, applicationId: string, inline = false, workspaceId?: string) {
    const access = await applicationAccess(userId, workspaceId);
    const attachment = await prisma.applicationCoverLetter.findFirst({ where: { applicationId, application: access.where }, select: { fileName: true, mimeType: true, size: true, content: true, storageKey: true } });
    if (!attachment) return null;
    if (attachment.storageKey) return { kind: "s3" as const, fileName: attachment.fileName, url: await applicationCoverLetterStorageService.createDownloadUrl(attachment.storageKey, attachment.fileName, attachment.mimeType, inline) };
    if (!attachment.content) return null;
    return { kind: "database" as const, fileName: attachment.fileName, mimeType: attachment.mimeType, size: attachment.size, content: attachment.content };
  },
};
