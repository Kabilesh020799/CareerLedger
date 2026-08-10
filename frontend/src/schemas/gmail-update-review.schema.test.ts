import { describe, expect, it } from 'vitest'
import { gmailUpdateReviewFormSchema } from './gmail-update-review.schema'

describe('gmailUpdateReviewFormSchema', () => {
  it('requires an application for an existing-application decision', () => {
    const result = gmailUpdateReviewFormSchema.safeParse({
      target: 'EXISTING',
      applicationId: '',
      status: 'INTERVIEW',
      company: '',
      jobTitle: '',
    })
    expect(result.success).toBe(false)
  })

  it('requires company and job title for a new application', () => {
    const result = gmailUpdateReviewFormSchema.safeParse({
      target: 'NEW',
      applicationId: '',
      status: 'APPLIED',
      company: '',
      jobTitle: '',
    })
    expect(result.success).toBe(false)
  })
})
