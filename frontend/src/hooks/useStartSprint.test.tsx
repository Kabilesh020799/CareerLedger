import type { PropsWithChildren } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { applicationService } from '../services/application.service'
import { applicationQueryKeys, sprintQueryKeys } from './applicationQueryKeys'
import { useStartSprint } from './useStartSprint'

vi.mock('../services/application.service', () => ({
  applicationService: { startSprint: vi.fn() },
}))

const result = {
  sprint: {
    id: 'sprint-2',
    userId: 'user-1',
    workspaceId: 'workspace-1',
    name: 'Sprint 2',
    sequence: 2,
    status: 'ACTIVE' as const,
    scheduledStartAt: null,
    durationDays: 21,
    endsAt: '2026-09-05T12:00:00.000Z',
    startedAt: '2026-08-15T12:00:00.000Z',
    closedAt: null,
    createdAt: '2026-08-15T12:00:00.000Z',
    updatedAt: '2026-08-15T12:00:00.000Z',
  },
  previousSprint: null,
  carriedOverCount: 2,
  closedRejectedCount: 1,
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: PropsWithChildren) => (
    <AppProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AppProvider>
  )
  return { wrapper, invalidate }
}

describe('useStartSprint', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts a sprint and refreshes current application views', async () => {
    vi.mocked(applicationService.startSprint).mockResolvedValue(result)
    const { wrapper, invalidate } = setup()
    const { result: hook } = renderHook(useStartSprint, { wrapper })

    await act(() => hook.current.mutateAsync({ name: 'Focused sprint', durationDays: 21 }))

    expect(applicationService.startSprint).toHaveBeenCalledWith({ name: 'Focused sprint', durationDays: 21 })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: applicationQueryKeys.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sprintQueryKeys.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
  })
})
