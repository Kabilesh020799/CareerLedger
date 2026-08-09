import { z } from "zod";

const resumeVersionFields = {
  name: z.string().trim().min(1, "Name is required").max(80),
  notes: z.string().trim().min(1).max(500).nullable().optional(),
};

export const createResumeVersionSchema = z.object(resumeVersionFields).strict();

export const updateResumeVersionSchema = z
  .object(resumeVersionFields)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type CreateResumeVersionInput = z.infer<
  typeof createResumeVersionSchema
>;
export type UpdateResumeVersionInput = z.infer<
  typeof updateResumeVersionSchema
>;
