import { z } from 'zod'

/** Client-side account creation and password-confirmation contract. */
export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Use only letters, numbers, underscores, or hyphens'),
  email: z.string().trim().email('Enter a valid email address').max(254),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[a-z]/, 'Include a lowercase letter')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[0-9]/, 'Include a number'),
  confirmPassword: z.string(),
}).refine((input) => input.password === input.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

/** Complete signup form values, including the browser-only confirmation. */
export type SignupInput = z.infer<typeof signupSchema>
/** Account details sent to the signup API. */
export type SignupRequest = Omit<SignupInput, 'confirmPassword'>
