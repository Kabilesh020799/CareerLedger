import { z } from 'zod'
import type { CreateResumeVersionInput, ResumeVersion } from '../types/resume'

export const resumeVersionFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  notes: z.string().trim().max(500).optional(),
})

export type ResumeVersionFormValues = z.infer<typeof resumeVersionFormSchema>

export const emptyResumeVersionForm: ResumeVersionFormValues = {
  name: '',
  notes: '',
}

export function resumeVersionToFormValues(
  resumeVersion: ResumeVersion,
): ResumeVersionFormValues {
  return {
    name: resumeVersion.name,
    notes: resumeVersion.notes ?? '',
  }
}

export function resumeVersionFormToInput(
  values: ResumeVersionFormValues,
): CreateResumeVersionInput {
  return {
    name: values.name.trim(),
    notes: values.notes?.trim() || null,
  }
}
