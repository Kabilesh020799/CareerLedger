import { z } from 'zod'
import { applicationStatuses } from '../types/application'
import { applicationResumeMaxBytes } from './application.schema'

const resumeMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const optionalResume = z.custom<FileList | undefined>().superRefine((files, context) => {
  const file = files?.item(0)
  if (!file) return
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (!['.pdf', '.doc', '.docx'].includes(extension) || !resumeMimeTypes.has(file.type)) {
    context.addIssue({ code: 'custom', message: 'Choose a PDF, DOC, or DOCX resume' })
  }
  if (file.size > applicationResumeMaxBytes) {
    context.addIssue({ code: 'custom', message: 'Resume must be 5 MB or smaller' })
  }
})

export const gmailUpdateReviewFormSchema = z
  .object({
    target: z.enum(['EXISTING', 'NEW']),
    applicationId: z.string(),
    status: z.enum(applicationStatuses),
    company: z.string().trim().max(200),
    jobTitle: z.string().trim().max(200),
    resumeVersionId: z.string().trim().optional(),
    resume: optionalResume.optional(),
  })
  .superRefine((value, context) => {
    if (value.target === 'EXISTING' && !value.applicationId.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['applicationId'],
        message: 'Choose an application',
      })
    }
    if (value.target === 'NEW' && !value.company.trim()) {
      context.addIssue({ code: 'custom', path: ['company'], message: 'Company is required' })
    }
    if (value.target === 'NEW' && !value.jobTitle.trim()) {
      context.addIssue({ code: 'custom', path: ['jobTitle'], message: 'Job title is required' })
    }
  })

export type GmailUpdateReviewFormValues = z.infer<typeof gmailUpdateReviewFormSchema>
