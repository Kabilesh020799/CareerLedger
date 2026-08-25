import type { PropsWithChildren } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applicationService } from '../services/application.service'
import { sprintQueryKeys } from './applicationQueryKeys'
import { useArchivedSprints } from './useArchivedSprints'

vi.mock('../services/application.service', () => ({
  applicationService: { listArchivedSprints: vi.fn() },
}))

describe('useArchivedSprints', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads archived applications grouped by sprint with a dedicated query key', async () => {
    const archived = [{
      sprint: {
        id: 'sprint-0',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        name: 'Sprint 0',
        sequence: 0,
        status: 'CLOSED' as const,
        durationDays: 14,
        startedAt: '2026-07-24T12:00:00.000Z',
        endsAt: '2026-08-07T12:00:00.000Z',
        closedAt: '2026-08-07T12:00:00.000Z',
        createdAt: '2026-07-24T12:00:00.000Z',
        updatedAt: '2026-08-07T12:00:00.000Z',
      },
      applications: [],
    }]
    vi.mocked(applicationService.listArchivedSprints).mockResolvedValue(archived)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(useArchivedSprints, { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(archived)
    expect(applicationService.listArchivedSprints).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(sprintQueryKeys.archived)).toEqual(archived)
  })
})
