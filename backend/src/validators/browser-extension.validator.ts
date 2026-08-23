import { z } from "zod";
import { httpOrHttpsUrlSchema } from "./http-url.validator";

export const createExtensionTokenSchema = z.object({
  name: z.string().trim().min(1).max(80),
}).strict();

export const captureJobPostingSchema = z.object({
  company: z.string().trim().min(1).max(200),
  jobTitle: z.string().trim().min(1).max(200),
  location: z.string().trim().min(1).max(200).nullable().optional(),
  jobUrl: httpOrHttpsUrlSchema.max(2000),
  jobDescription: z.string().trim().min(1).max(50_000),
  skills: z.array(z.string().trim().min(1).max(100)).max(50).optional().default([]),
  experienceRequirements: z.string().trim().max(5000).nullable().optional(),
  salaryMin: z.number().finite().nonnegative().max(1_000_000_000).nullable().optional(),
  salaryMax: z.number().finite().nonnegative().max(1_000_000_000).nullable().optional(),
  salaryCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).nullable().optional(),
  salaryPeriod: z.enum(["HOUR", "DAY", "WEEK", "MONTH", "YEAR"]).nullable().optional(),
  workMode: z.enum(["REMOTE", "HYBRID", "ONSITE"]).nullable().optional(),
}).strict().refine(
  ({ salaryMin, salaryMax }) => salaryMin == null || salaryMax == null || salaryMin <= salaryMax,
  { message: "Salary minimum cannot exceed salary maximum", path: ["salaryMax"] },
);

export type CaptureJobPostingInput = z.infer<typeof captureJobPostingSchema>;
