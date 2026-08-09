import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import { dashboardService } from './dashboard.service'

vi.mock('./api', () => ({ api: { get: vi.fn() } }))

describe('dashboardService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the authenticated dashboard summary', async () => {
    const summary = {
      totalApplications: 6,
      createdThisWeek: 2,
      weekStartedAt: '2026-08-03T00:00:00.000Z',
      submittedApplications: 5,
      statusCounts: {},
      conversionRates: { screening: 60, interview: 40, offer: 20 },
    }
    vi.mocked(api.get).mockResolvedValue({ data: summary })

    await expect(dashboardService.getSummary()).resolves.toEqual(summary)
    expect(api.get).toHaveBeenCalledWith('/dashboard/summary')
  })
})
