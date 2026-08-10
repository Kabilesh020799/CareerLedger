"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationResumeService = void 0;
exports.buildApplicationResumeFileName = buildApplicationResumeFileName;
exports.applicationResumeCreateData = applicationResumeCreateData;
const prisma_1 = require("../config/prisma");
const maxNameSegmentLength = 80;
function fileNameSegment(value, fallback) {
    const normalized = value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, maxNameSegmentLength)
        .replace(/_+$/g, "");
    return normalized || fallback;
}
function buildApplicationResumeFileName(jobTitle, company, extension) {
    return `${fileNameSegment(jobTitle, "Role")}_${fileNameSegment(company, "Company")}${extension}`;
}
function applicationResumeCreateData(jobTitle, company, upload) {
    return {
        fileName: buildApplicationResumeFileName(jobTitle, company, upload.extension),
        mimeType: upload.mimeType,
        size: upload.size,
        content: Uint8Array.from(upload.content),
    };
}
exports.applicationResumeService = {
    findForApplication(userId, applicationId) {
        return prisma_1.prisma.applicationResume.findFirst({
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
