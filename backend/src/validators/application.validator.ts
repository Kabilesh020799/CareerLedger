import { z } from "zod";

export const applicationStatuses = [
  "SAVED",
  "APPLIED",
  "SCREENING",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;

const nullableText = z.string().trim().min(1).nullable().optional();

export const createApplicationSchema = z.object({
  company: z.string().trim().min(1, "Company is required"),
  jobTitle: z.string().trim().min(1, "Job title is required"),
  location: nullableText,
  jobUrl: z.url("Job URL must be a valid URL").nullable().optional(),
  source: nullableText,
  status: z.enum(applicationStatuses).optional(),
  notes: nullableText,
  appliedAt: z.coerce.date().nullable().optional(),
  resumeVersionId: z.string().trim().min(1).nullable().optional(),
  resumeUploadKey: z.string().trim().min(1).max(500).optional(),
});

export const updateApplicationSchema = createApplicationSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
