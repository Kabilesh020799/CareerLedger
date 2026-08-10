"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationResumeUploadKeySchema = exports.createApplicationResumeUploadSchema = exports.applicationResumeMaxBytes = void 0;
exports.validateApplicationResumeMetadata = validateApplicationResumeMetadata;
exports.validateApplicationResume = validateApplicationResume;
const node_path_1 = __importDefault(require("node:path"));
const zod_1 = require("zod");
exports.applicationResumeMaxBytes = 5 * 1024 * 1024;
const resumeTypes = {
    ".pdf": {
        mimeType: "application/pdf",
        hasSignature: (content) => content.subarray(0, 5).toString() === "%PDF-",
    },
    ".doc": {
        mimeType: "application/msword",
        hasSignature: (content) => content.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])),
    },
    ".docx": {
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        hasSignature: (content) => content.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
    },
};
function validateApplicationResumeMetadata(fileName, mimeType) {
    const extension = node_path_1.default.extname(fileName).toLowerCase();
    if (!(extension in resumeTypes)) {
        return { success: false, error: "Resume must be a PDF, DOC, or DOCX file" };
    }
    const typedExtension = extension;
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
function validateApplicationResume(file) {
    if (!file)
        return { success: true, data: undefined };
    const size = file.size;
    if (size === 0) {
        return { success: false, error: "Resume file cannot be empty" };
    }
    if (size > exports.applicationResumeMaxBytes) {
        return { success: false, error: "Resume must be 5 MB or smaller" };
    }
    const metadata = validateApplicationResumeMetadata(file.originalname, file.mimetype);
    if (!metadata.success)
        return metadata;
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
exports.createApplicationResumeUploadSchema = zod_1.z.object({
    fileName: zod_1.z.string().trim().min(1).max(255),
    mimeType: zod_1.z.string().trim().min(1).max(255),
    size: zod_1.z
        .number()
        .int()
        .min(1, "Resume file cannot be empty")
        .max(exports.applicationResumeMaxBytes, "Resume must be 5 MB or smaller"),
});
exports.applicationResumeUploadKeySchema = zod_1.z.object({
    storageKey: zod_1.z.string().trim().min(1).max(500),
});
