import { describe, expect, it } from 'vitest'
import {
  applicationFormSchema,
  applicationFormToInput,
  applicationResumeMaxBytes,
  type ApplicationFormValues,
} from './application.schema'

const validApplication: ApplicationFormValues = {
  company: 'Acme Corp',
  jobTitle: 'Software Engineer',
  location: '',
  jobUrl: 'https://example.com/jobs/engineer',
  source: 'LinkedIn',
  status: 'APPLIED',
  notes: '',
  appliedAt: '2026-08-06',
  resumeVersionId: 'resume-1',
}

describe('applicationFormSchema', () => {
  it('accepts valid application form values', () => {
    expect(applicationFormSchema.safeParse(validApplication).success).toBe(true)
  })

  it('requires a company and job title', () => {
    const result = applicationFormSchema.safeParse({
      ...validApplication,
      company: ' ',
      jobTitle: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.company).toContain('Company is required')
      expect(result.error.flatten().fieldErrors.jobTitle).toContain('Job title is required')
    }
  })

  it('rejects invalid URLs, dates, and statuses', () => {
    const result = applicationFormSchema.safeParse({
      ...validApplication,
      jobUrl: 'not-a-url',
      appliedAt: 'not-a-date',
      status: 'UNKNOWN',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors
      expect(errors.jobUrl).toContain('Enter a valid URL')
      expect(errors.appliedAt).toContain('Enter a valid applied date')
      expect(errors.status).toBeDefined()
    }
  })

  it('normalizes optional form fields for the API', () => {
    const input = applicationFormToInput({
      ...validApplication,
      company: '  Acme Corp  ',
      location: ' ',
      jobUrl: '',
      notes: ' Follow up next week ',
    })

    expect(input).toMatchObject({
      company: 'Acme Corp',
      location: null,
      jobUrl: null,
      notes: 'Follow up next week',
      appliedAt: expect.stringContaining('2026-08-06'),
      resumeVersionId: 'resume-1',
    })
  })

  it('accepts supported resume files and rejects invalid or oversized files', () => {
    const pdf = new File(['resume'], 'resume.pdf', { type: 'application/pdf' })
    const invalid = new File(['resume'], 'resume.txt', { type: 'text/plain' })
    const oversized = new File([new Uint8Array(applicationResumeMaxBytes + 1)], 'resume.pdf', {
      type: 'application/pdf',
    })
    const fileList = (file: File) => ({ item: () => file, length: 1, 0: file }) as unknown as FileList

    expect(applicationFormSchema.safeParse({
      ...validApplication,
      resume: fileList(pdf),
    }).success).toBe(true)
    expect(applicationFormSchema.safeParse({
      ...validApplication,
      resume: fileList(invalid),
    }).success).toBe(false)
    expect(applicationFormSchema.safeParse({
      ...validApplication,
      resume: fileList(oversized),
    }).success).toBe(false)
  })
})
