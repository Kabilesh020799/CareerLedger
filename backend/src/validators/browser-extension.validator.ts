import { z } from "zod";

export const createExtensionTokenSchema = z.object({
  name: z.string().trim().min(1).max(80),
}).strict();

export const captureJobPostingSchema = z.object({
  company: z.string().trim().min(1).max(200),
  jobTitle: z.string().trim().min(1).max(200),
  location: z.string().trim().min(1).max(200).nullable().optional(),
  jobUrl: z.url().max(2000),
  jobDescription: z.string().trim().min(1).max(50_000),
}).strict();

export type CaptureJobPostingInput = z.infer<typeof captureJobPostingSchema>;
