import { z } from 'zod'
import type { CreateResumeVersionInput, ResumeVersion } from '../types/resume'

export const resumeVersionFormSchema = z.object({
  name: z.string().trim().min(1, 'Tag name is required').max(80),
})

export type ResumeVersionFormValues = z.infer<typeof resumeVersionFormSchema>

export const emptyResumeVersionForm: ResumeVersionFormValues = {
  name: '',
}

export const suggestedResumeTags = ['Backend', 'Frontend', 'Full-stack', 'General'] as const

export function resumeVersionToFormValues(
  resumeVersion: ResumeVersion,
): ResumeVersionFormValues {
  return {
    name: resumeVersion.name,
  }
}

export function resumeVersionFormToInput(
  values: ResumeVersionFormValues,
): CreateResumeVersionInput {
  return {
    name: values.name.trim(),
    notes: null,
  }
}
