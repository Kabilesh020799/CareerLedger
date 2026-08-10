"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateApplicationSchema = exports.createApplicationSchema = exports.applicationStatuses = void 0;
const zod_1 = require("zod");
exports.applicationStatuses = [
    "SAVED",
    "APPLIED",
    "SCREENING",
    "ASSESSMENT",
    "INTERVIEW",
    "OFFER",
    "REJECTED",
    "WITHDRAWN",
];
const nullableText = zod_1.z.string().trim().min(1).nullable().optional();
exports.createApplicationSchema = zod_1.z.object({
    company: zod_1.z.string().trim().min(1, "Company is required"),
    jobTitle: zod_1.z.string().trim().min(1, "Job title is required"),
    location: nullableText,
    jobUrl: zod_1.z.url("Job URL must be a valid URL").nullable().optional(),
    source: nullableText,
    status: zod_1.z.enum(exports.applicationStatuses).optional(),
    notes: nullableText,
    appliedAt: zod_1.z.coerce.date().nullable().optional(),
    resumeVersionId: zod_1.z.string().trim().min(1).nullable().optional(),
    resumeUploadKey: zod_1.z.string().trim().min(1).max(500).optional(),
});
exports.updateApplicationSchema = exports.createApplicationSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
});
