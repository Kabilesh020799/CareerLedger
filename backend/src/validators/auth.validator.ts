import { z } from "zod";

export const passwordLoginSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(64),
  password: z.string().min(1, "Password is required").max(256),
});

export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;
