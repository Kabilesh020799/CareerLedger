import { z } from "zod";

export const startSprintSchema = z.object({
  name: z.string().trim().min(1, "Sprint name cannot be empty").max(100, "Sprint name is too long").optional(),
});

export type StartSprintInput = z.infer<typeof startSprintSchema>;
