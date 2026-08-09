"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateResumeVersionSchema = exports.createResumeVersionSchema = void 0;
const zod_1 = require("zod");
const resumeVersionFields = {
    name: zod_1.z.string().trim().min(1, "Name is required").max(80),
    notes: zod_1.z.string().trim().min(1).max(500).nullable().optional(),
};
exports.createResumeVersionSchema = zod_1.z.object(resumeVersionFields).strict();
exports.updateResumeVersionSchema = zod_1.z
    .object(resumeVersionFields)
    .partial()
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
});
