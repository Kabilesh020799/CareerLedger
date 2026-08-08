import { z } from 'zod'
import type { CreateApplicationEventInput } from '../types/application'

export const applicationEventFormSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(2000, 'Description must contain at most 2000 characters'),
  occurredAt: z
    .string()
    .min(1, 'Occurrence date is required')
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), {
      message: 'Enter a valid occurrence date',
    }),
})

export type ApplicationEventFormValues = z.infer<typeof applicationEventFormSchema>

export function emptyApplicationEventForm(date = new Date()): ApplicationEventFormValues {
  return {
    description: '',
    occurredAt: date.toISOString().slice(0, 10),
  }
}

export function applicationEventFormToInput(
  values: ApplicationEventFormValues,
): CreateApplicationEventInput {
  return {
    type: 'NOTE',
    description: values.description.trim(),
    occurredAt: new Date(`${values.occurredAt}T00:00:00.000Z`).toISOString(),
  }
}
