import { describe, expect, it } from 'vitest'
import {
  resumeVersionFormSchema,
  resumeVersionFormToInput,
} from './resume-version.schema'

describe('resume version form', () => {
  it('validates and normalizes a resume version', () => {
    const values = resumeVersionFormSchema.parse({
      name: ' Full-stack resume ',
      notes: ' TypeScript focus ',
    })

    expect(resumeVersionFormToInput(values)).toEqual({
      name: 'Full-stack resume',
      notes: 'TypeScript focus',
    })
  })

  it('rejects missing and overly long names', () => {
    expect(resumeVersionFormSchema.safeParse({ name: '', notes: '' }).success)
      .toBe(false)
    expect(
      resumeVersionFormSchema.safeParse({ name: 'x'.repeat(81), notes: '' })
        .success,
    ).toBe(false)
  })

  it('normalizes empty notes to null', () => {
    expect(resumeVersionFormToInput({ name: 'Backend resume', notes: ' ' }))
      .toEqual({ name: 'Backend resume', notes: null })
  })
})
