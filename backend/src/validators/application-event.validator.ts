import { z } from "zod";

export const createApplicationEventSchema = z
  .object({
    type: z.literal("NOTE"),
    description: z
      .string()
      .trim()
      .min(1, "Description is required")
      .max(2000, "Description must contain at most 2000 characters"),
    occurredAt: z.coerce.date(),
  })
  .strict();

export type CreateApplicationEventInput = z.infer<
  typeof createApplicationEventSchema
>;
