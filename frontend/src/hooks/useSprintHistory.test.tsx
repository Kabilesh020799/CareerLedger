import type { PropsWithChildren } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applicationService } from '../services/application.service'
import { useSprintHistory } from './useSprintHistory'

vi.mock('../services/application.service', () => ({
  applicationService: { listSprints: vi.fn() },
}))

describe('useSprintHistory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exposes newest-first sprint history through TanStack Query', async () => {
    const history = [
      {
        id: 'sprint-2',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        name: 'Sprint 2',
        sequence: 2,
        status: 'ACTIVE' as const,
        durationDays: 14,
        startedAt: '2026-08-15T12:00:00.000Z',
        endsAt: '2026-08-29T12:00:00.000Z',
        closedAt: null,
        createdAt: '2026-08-15T12:00:00.000Z',
        updatedAt: '2026-08-15T12:00:00.000Z',
      },
    ]
    vi.mocked(applicationService.listSprints).mockResolvedValue(history)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(useSprintHistory, { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(history)
    expect(applicationService.listSprints).toHaveBeenCalledOnce()
  })
})
