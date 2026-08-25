import type { PropsWithChildren } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applicationService } from '../services/application.service'
import { useScheduledSprints } from './useScheduledSprints'

vi.mock('../services/application.service', () => ({
  applicationService: { listSprints: vi.fn() },
}))

const baseSprint = {
  id: 'sprint-1',
  userId: 'user-1',
  workspaceId: 'workspace-1',
  name: 'Sprint 1',
  sequence: 1,
  status: 'SCHEDULED' as const,
  scheduledStartAt: '2026-09-05T13:00:00.000Z',
  durationDays: 14,
  startedAt: '2026-08-24T13:00:00.000Z',
  endsAt: '2026-09-19T13:00:00.000Z',
  closedAt: null,
  createdAt: '2026-08-24T13:00:00.000Z',
  updatedAt: '2026-08-24T13:00:00.000Z',
}

describe('useScheduledSprints', () => {
  beforeEach(() => vi.clearAllMocks())

  it('filters and orders scheduled plans by planned start time', async () => {
    vi.mocked(applicationService.listSprints).mockResolvedValue([
      { ...baseSprint, id: 'sprint-later', name: 'Later', sequence: 3, scheduledStartAt: '2026-09-20T13:00:00.000Z' },
      { ...baseSprint, id: 'sprint-active', name: 'Active', status: 'ACTIVE', scheduledStartAt: null },
      { ...baseSprint, id: 'sprint-sooner', name: 'Sooner', sequence: 2, scheduledStartAt: '2026-09-01T13:00:00.000Z' },
    ])
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(useScheduledSprints, { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.map((sprint) => sprint.name)).toEqual(['Sooner', 'Later'])
    expect(applicationService.listSprints).toHaveBeenCalledOnce()
  })
})
