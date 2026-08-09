import { z } from "zod";

export const gmailCallbackQuerySchema = z
  .object({
    code: z.string().min(1).optional(),
    error: z.string().min(1).optional(),
    state: z.string().min(1),
  })
  .refine((query) => Boolean(query.code || query.error), {
    message: "The authorization result is missing",
  });
