import { z } from 'zod'
import { applicationStatuses } from '../types/application'

export const gmailUpdateReviewFormSchema = z
  .object({
    target: z.enum(['EXISTING', 'NEW']),
    applicationId: z.string(),
    status: z.enum(applicationStatuses),
    company: z.string().trim().max(200),
    jobTitle: z.string().trim().max(200),
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
