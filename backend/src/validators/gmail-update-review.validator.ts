import { z } from "zod";
import { applicationStatuses } from "./application.validator";

const ignoreReviewSchema = z.object({
  action: z.literal("IGNORE"),
});

const confirmReviewSchema = z.object({
  action: z.literal("CONFIRM"),
  applicationId: z.string().trim().min(1, "Application is required"),
  status: z.enum(applicationStatuses),
});

const createApplicationReviewSchema = z.object({
  action: z.literal("CREATE_APPLICATION"),
  company: z.string().trim().min(1, "Company is required").max(200),
  jobTitle: z.string().trim().min(1, "Job title is required").max(200),
  status: z.enum(applicationStatuses),
  resumeVersionId: z.string().trim().min(1).nullable().optional(),
  resumeUploadKey: z.string().trim().min(1).max(500).optional(),
});

export const resolveGmailUpdateReviewSchema = z.discriminatedUnion("action", [
  ignoreReviewSchema,
  confirmReviewSchema,
  createApplicationReviewSchema,
]);

export type ResolveGmailUpdateReviewInput = z.infer<
  typeof resolveGmailUpdateReviewSchema
>;
