import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
});

export const deleteAccountSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().max(256).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
