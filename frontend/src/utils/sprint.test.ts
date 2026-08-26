import { describe, expect, it } from 'vitest'
import {
  earliestFutureSprintDate,
  localSprintDateInputToIso,
  nextAvailableSprintDate,
  toLocalSprintDateInput,
} from './sprint'

const currentSprint = {
  id: 'sprint-current',
  userId: 'user-1',
  workspaceId: null,
  name: 'Current sprint',
  sequence: 1,
  status: 'ACTIVE' as const,
  scheduledStartAt: null,
  durationDays: 14,
  startedAt: '2026-08-01T00:00:00.000Z',
  endsAt: '2026-08-15T00:00:00.000Z',
  closedAt: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
}

describe('sprint date helpers', () => {
  it('round-trips a local whole-day date at midnight', () => {
    const value = '2026-09-10'
    expect(toLocalSprintDateInput(localSprintDateInputToIso(value))).toBe(value)
  })

  it('defaults after the latest sprint window', () => {
    expect(nextAvailableSprintDate(currentSprint, [], new Date('2026-08-05T12:00:00.000Z')))
      .toBe(toLocalSprintDateInput(new Date('2026-08-16T00:00:00.000Z').toISOString()))
  })

  it('uses tomorrow when no sprint window is later than today', () => {
    const now = new Date('2026-08-05T12:00:00.000Z')
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    expect(earliestFutureSprintDate(now)).toBe(toLocalSprintDateInput(tomorrow.toISOString()))
  })
})
