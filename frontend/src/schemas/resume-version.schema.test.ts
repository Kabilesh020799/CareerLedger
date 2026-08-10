import { describe, expect, it } from 'vitest'
import {
  resumeVersionFormSchema,
  resumeVersionFormToInput,
} from './resume-version.schema'

describe('resume tag form', () => {
  it('validates and normalizes a resume tag', () => {
    const values = resumeVersionFormSchema.parse({
      name: ' Full-stack resume ',
    })

    expect(resumeVersionFormToInput(values)).toEqual({
      name: 'Full-stack resume',
      notes: null,
    })
  })

  it('rejects missing and overly long names', () => {
    expect(resumeVersionFormSchema.safeParse({ name: '' }).success)
      .toBe(false)
    expect(
      resumeVersionFormSchema.safeParse({ name: 'x'.repeat(81) })
        .success,
    ).toBe(false)
  })

  it('stores tags without notes', () => {
    expect(resumeVersionFormToInput({ name: 'Backend resume' }))
      .toEqual({ name: 'Backend resume', notes: null })
  })
})
