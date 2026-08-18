import { z } from 'zod'
import { applicationStatuses } from '../types/application'
import type { Application, CreateApplicationInput } from '../types/application'

const optionalText = z.string().trim().optional()
export const applicationResumeMaxBytes = 5 * 1024 * 1024
const attachmentMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const attachmentExtensions = ['.pdf', '.doc', '.docx']

function attachmentFileList(documentName: 'resume' | 'cover letter') {
  return z.custom<FileList | undefined>().superRefine((files, context) => {
    const file = files?.item(0)
    if (!file) return

    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!attachmentExtensions.includes(extension) || !attachmentMimeTypes.has(file.type)) {
      context.addIssue({
        code: 'custom',
        message: `Choose a PDF, DOC, or DOCX ${documentName}`,
      })
    }
    if (file.size > applicationResumeMaxBytes) {
      const label = documentName[0].toUpperCase() + documentName.slice(1)
      context.addIssue({ code: 'custom', message: `${label} must be 5 MB or smaller` })
    }
  })
}

export const applicationFormSchema = z.object({
  company: z.string().trim().min(1, 'Company is required'),
  jobTitle: z.string().trim().min(1, 'Job title is required'),
  location: optionalText,
  jobUrl: z
    .string()
    .trim()
    .refine((value) => value === '' || z.url().safeParse(value).success, {
      message: 'Enter a valid URL',
    })
    .optional(),
  source: optionalText,
  status: z.enum(applicationStatuses),
  notes: optionalText,
  appliedAt: z
    .string()
    .refine((value) => value === '' || !Number.isNaN(Date.parse(value)), {
      message: 'Enter a valid applied date',
    })
    .optional(),
  resumeVersionId: z.string().trim().optional(),
  resume: attachmentFileList('resume').optional(),
  coverLetter: attachmentFileList('cover letter').optional(),
})

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>

export const emptyApplicationForm: ApplicationFormValues = {
  company: '',
  jobTitle: '',
  location: '',
  jobUrl: '',
  source: '',
  status: 'SAVED',
  notes: '',
  appliedAt: '',
  resumeVersionId: '',
  resume: undefined,
  coverLetter: undefined,
}

export function applicationToFormValues(application: Application): ApplicationFormValues {
  return {
    company: application.company,
    jobTitle: application.jobTitle,
    location: application.location ?? '',
    jobUrl: application.jobUrl ?? '',
    source: application.source ?? '',
    status: application.status,
    notes: application.notes ?? '',
    appliedAt: application.appliedAt?.slice(0, 10) ?? '',
    resumeVersionId: application.resumeVersionId ?? '',
    resume: undefined,
    coverLetter: undefined,
  }
}

export function applicationFormResume(values: ApplicationFormValues) {
  return values.resume?.item(0) ?? undefined
}

/** Returns the selected cover-letter file without placing file bytes in form input data. */
export function applicationFormCoverLetter(values: ApplicationFormValues) {
  return values.coverLetter?.item(0) ?? undefined
}

export function applicationFormToInput(values: ApplicationFormValues): CreateApplicationInput {
  const nullable = (value?: string) => value?.trim() || null

  return {
    company: values.company.trim(),
    jobTitle: values.jobTitle.trim(),
    location: nullable(values.location),
    jobUrl: nullable(values.jobUrl),
    source: nullable(values.source),
    status: values.status,
    notes: nullable(values.notes),
    appliedAt: values.appliedAt ? new Date(`${values.appliedAt}T00:00:00.000Z`).toISOString() : null,
    resumeVersionId: nullable(values.resumeVersionId),
  }
}
