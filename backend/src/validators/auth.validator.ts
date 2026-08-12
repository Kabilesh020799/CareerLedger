import { z } from "zod";

export const passwordLoginSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(64),
  password: z.string().min(1, "Password is required").max(256),
});

export const passwordSignupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/, "Username may contain letters, numbers, underscores, and hyphens"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number"),
});

export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;
export type PasswordSignupInput = z.infer<typeof passwordSignupSchema>;
