import { describe, expect, it } from 'vitest'
import type { ReminderWithApplication } from '../types/reminder'
import { partitionOpenReminders } from './reminder'

function reminder(id: string, dueAt: string): ReminderWithApplication {
  return {
    id,
    applicationId: 'application-1',
    type: 'FOLLOW_UP',
    description: id,
    dueAt,
    completedAt: null,
    createdAt: '2026-08-09T00:00:00.000Z',
    updatedAt: '2026-08-09T00:00:00.000Z',
    application: {
      id: 'application-1',
      company: 'Acme Corp',
      jobTitle: 'Engineer',
    },
  }
}

describe('partitionOpenReminders', () => {
  it('separates reminders before and after the current time', () => {
    const result = partitionOpenReminders(
      [
        reminder('overdue', '2026-08-08T12:00:00.000Z'),
        reminder('upcoming', '2026-08-10T12:00:00.000Z'),
      ],
      new Date('2026-08-09T12:00:00.000Z'),
    )

    expect(result.overdue.map(({ id }) => id)).toEqual(['overdue'])
    expect(result.upcoming.map(({ id }) => id)).toEqual(['upcoming'])
  })
})
