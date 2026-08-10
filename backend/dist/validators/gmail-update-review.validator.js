"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveGmailUpdateReviewSchema = void 0;
const zod_1 = require("zod");
const application_validator_1 = require("./application.validator");
const ignoreReviewSchema = zod_1.z.object({
    action: zod_1.z.literal("IGNORE"),
});
const confirmReviewSchema = zod_1.z.object({
    action: zod_1.z.literal("CONFIRM"),
    applicationId: zod_1.z.string().trim().min(1, "Application is required"),
    status: zod_1.z.enum(application_validator_1.applicationStatuses),
});
const createApplicationReviewSchema = zod_1.z.object({
    action: zod_1.z.literal("CREATE_APPLICATION"),
    company: zod_1.z.string().trim().min(1, "Company is required").max(200),
    jobTitle: zod_1.z.string().trim().min(1, "Job title is required").max(200),
    status: zod_1.z.enum(application_validator_1.applicationStatuses),
});
exports.resolveGmailUpdateReviewSchema = zod_1.z.discriminatedUnion("action", [
    ignoreReviewSchema,
    confirmReviewSchema,
    createApplicationReviewSchema,
]);
