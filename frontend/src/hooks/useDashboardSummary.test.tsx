import type { PropsWithChildren } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardService } from '../services/dashboard.service'
import { useDashboardSummary } from './useDashboardSummary'

vi.mock('../services/dashboard.service', () => ({
  dashboardService: { getSummary: vi.fn() },
}))

describe('useDashboardSummary', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exposes the dashboard summary through TanStack Query', async () => {
    const summary = {
      totalApplications: 0,
      createdThisWeek: 0,
      weekStartedAt: '2026-08-03T00:00:00.000Z',
      submittedApplications: 0,
      statusCounts: {
        SAVED: 0,
        APPLIED: 0,
        SCREENING: 0,
        ASSESSMENT: 0,
        INTERVIEW: 0,
        OFFER: 0,
        REJECTED: 0,
        WITHDRAWN: 0,
      },
      conversionRates: { screening: 0, interview: 0, offer: 0 },
      resumeOutcomes: [],
      sourceOutcomes: [],
    }
    vi.mocked(dashboardService.getSummary).mockResolvedValue(summary)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(useDashboardSummary, { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(summary)
    expect(dashboardService.getSummary).toHaveBeenCalledOnce()
  })
})
