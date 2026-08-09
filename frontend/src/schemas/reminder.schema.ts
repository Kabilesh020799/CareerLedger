import { z } from 'zod'
import { reminderTypes, type CreateReminderInput } from '../types/reminder'

export const reminderFormSchema = z.object({
  type: z.enum(reminderTypes),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(200, 'Description must contain at most 200 characters'),
  dueAt: z.iso.datetime({
    local: true,
    error: 'Enter a valid reminder date and time',
  }),
})

export type ReminderFormValues = z.infer<typeof reminderFormSchema>

export function emptyReminderForm(): ReminderFormValues {
  return { type: 'FOLLOW_UP', description: '', dueAt: '' }
}

export function reminderFormToInput(
  values: ReminderFormValues,
): CreateReminderInput {
  return {
    type: values.type,
    description: values.description,
    dueAt: new Date(values.dueAt).toISOString(),
  }
}
