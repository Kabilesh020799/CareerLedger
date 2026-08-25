import { z } from "zod";

export const startSprintSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Sprint name cannot be empty")
    .max(100, "Sprint name is too long")
    .optional(),
  durationDays: z
    .number()
    .int("Sprint duration must be a whole number of days")
    .min(1, "Sprint duration must be at least 1 day")
    .max(90, "Sprint duration cannot exceed 90 days")
    .optional(),
});

export type StartSprintInput = z.infer<typeof startSprintSchema>;
