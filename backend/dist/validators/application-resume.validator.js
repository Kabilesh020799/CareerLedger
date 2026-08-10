"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationResumeMaxBytes = void 0;
exports.validateApplicationResume = validateApplicationResume;
const node_path_1 = __importDefault(require("node:path"));
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
function validateApplicationResume(file) {
    if (!file)
        return { success: true, data: undefined };
    const size = file.buffer.length;
    if (size === 0) {
        return { success: false, error: "Resume file cannot be empty" };
    }
    if (size > exports.applicationResumeMaxBytes) {
        return { success: false, error: "Resume must be 5 MB or smaller" };
    }
    const extension = node_path_1.default.extname(file.originalname).toLowerCase();
    if (!(extension in resumeTypes)) {
        return { success: false, error: "Resume must be a PDF, DOC, or DOCX file" };
    }
    const typedExtension = extension;
    const expectedType = resumeTypes[typedExtension];
    if (file.mimetype !== expectedType.mimeType ||
        !expectedType.hasSignature(file.buffer)) {
        return {
            success: false,
            error: "Resume contents must match its PDF, DOC, or DOCX file type",
        };
    }
    return {
        success: true,
        data: {
            content: file.buffer,
            extension: typedExtension,
            mimeType: expectedType.mimeType,
            size,
        },
    };
}
