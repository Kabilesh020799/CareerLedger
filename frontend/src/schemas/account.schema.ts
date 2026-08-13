import { z } from 'zod'

export const emailRequestSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(12, 'Password must be at least 12 characters').max(72)
    .regex(/[a-z]/, 'Include a lowercase letter')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[0-9]/, 'Include a number'),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
})

export const deleteAccountSchema = z.object({
  email: z.string().trim().email('Enter your account email'),
  password: z.string().max(256).optional(),
})

export type EmailRequestInput = z.infer<typeof emailRequestSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ProfileInput = z.infer<typeof profileSchema>
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>
