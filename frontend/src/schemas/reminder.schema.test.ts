import { describe, expect, it } from 'vitest'
import { reminderFormSchema, reminderFormToInput } from './reminder.schema'

describe('reminder form schema', () => {
  it('validates and trims a reminder form', () => {
    expect(reminderFormSchema.parse({
      type: 'FOLLOW_UP',
      description: '  Contact the recruiter  ',
      dueAt: '2099-08-15T09:30',
    })).toEqual({
      type: 'FOLLOW_UP',
      description: 'Contact the recruiter',
      dueAt: '2099-08-15T09:30',
    })
  })

  it.each([
    { type: 'UNKNOWN', description: 'Follow up', dueAt: '2099-08-15T09:30' },
    { type: 'DEADLINE', description: '', dueAt: '2099-08-15T09:30' },
    { type: 'DEADLINE', description: 'Assessment', dueAt: '2099-02-31T09:30' },
  ])('rejects invalid form data: %j', (input) => {
    expect(reminderFormSchema.safeParse(input).success).toBe(false)
  })

  it('converts the local due time to an API timestamp', () => {
    const input = reminderFormToInput({
      type: 'DEADLINE',
      description: 'Submit assessment',
      dueAt: '2099-08-15T09:30',
    })

    expect(input.type).toBe('DEADLINE')
    expect(input.description).toBe('Submit assessment')
    expect(new Date(input.dueAt).toISOString()).toBe(input.dueAt)
  })
})
