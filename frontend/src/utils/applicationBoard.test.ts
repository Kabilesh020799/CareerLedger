import { describe, expect, it } from 'vitest'
import type { Application } from '../types/application'
import { groupApplicationsByStatus } from './applicationBoard'

const application = {
  id: 'application-1',
  company: 'Acme Corp',
  jobTitle: 'Software Engineer',
  location: null,
  jobUrl: null,
  source: null,
  status: 'APPLIED',
  notes: null,
  appliedAt: null,
  createdAt: '2026-08-08T12:00:00.000Z',
  updatedAt: '2026-08-08T12:00:00.000Z',
} satisfies Application

describe('groupApplicationsByStatus', () => {
  it('creates every status column and places applications in their current one', () => {
    const grouped = groupApplicationsByStatus([
      application,
      { ...application, id: 'application-2', status: 'INTERVIEW' },
    ])

    expect(Object.keys(grouped)).toHaveLength(8)
    expect(grouped.APPLIED.map(({ id }) => id)).toEqual(['application-1'])
    expect(grouped.INTERVIEW.map(({ id }) => id)).toEqual(['application-2'])
    expect(grouped.OFFER).toEqual([])
  })
})
