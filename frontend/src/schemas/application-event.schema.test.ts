import { describe, expect, it } from 'vitest'
import {
  applicationEventFormSchema,
  applicationEventFormToInput,
  emptyApplicationEventForm,
} from './application-event.schema'

describe('application event form schema', () => {
  it('creates deterministic default values for a supplied date', () => {
    expect(emptyApplicationEventForm(new Date('2026-08-07T15:30:00.000Z'))).toEqual({
      description: '',
      occurredAt: '2026-08-07',
    })
  })

  it('trims a note and converts its occurrence date for the API', () => {
    expect(
      applicationEventFormToInput({
        description: ' Followed up with the recruiter. ',
        occurredAt: '2026-08-07',
      }),
    ).toEqual({
      type: 'NOTE',
      description: 'Followed up with the recruiter.',
      occurredAt: '2026-08-07T00:00:00.000Z',
    })
  })

  it('rejects an empty note', () => {
    const result = applicationEventFormSchema.safeParse({
      description: '   ',
      occurredAt: '2026-08-07',
    })

    expect(result.success).toBe(false)
  })
})
