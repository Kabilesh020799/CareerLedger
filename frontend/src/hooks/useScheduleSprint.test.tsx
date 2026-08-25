import type { PropsWithChildren } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { applicationService } from '../services/application.service'
import { applicationQueryKeys, sprintQueryKeys } from './applicationQueryKeys'
import { useScheduleSprint } from './useScheduleSprint'

vi.mock('../services/application.service', () => ({
  applicationService: { scheduleSprint: vi.fn() },
}))

const scheduledSprint = {
  id: 'sprint-scheduled',
  userId: 'user-1',
  workspaceId: 'workspace-1',
  name: 'Interview push',
  sequence: 2,
  status: 'SCHEDULED' as const,
  scheduledStartAt: '2026-09-01T13:00:00.000Z',
  durationDays: 14,
  startedAt: '2026-08-24T13:00:00.000Z',
  endsAt: '2026-09-15T13:00:00.000Z',
  closedAt: null,
  createdAt: '2026-08-24T13:00:00.000Z',
  updatedAt: '2026-08-24T13:00:00.000Z',
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: PropsWithChildren) => (
    <AppProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AppProvider>
  )
  return { wrapper, invalidate }
}

describe('useScheduleSprint', () => {
  beforeEach(() => vi.clearAllMocks())

  it('schedules a sprint and refreshes sprint-backed views', async () => {
    vi.mocked(applicationService.scheduleSprint).mockResolvedValue(scheduledSprint)
    const input = {
      name: 'Interview push',
      durationDays: 14,
      startsAt: '2026-09-01T13:00:00.000Z',
    }
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(useScheduleSprint, { wrapper })

    await act(() => result.current.mutateAsync(input))

    expect(applicationService.scheduleSprint).toHaveBeenCalledWith(input)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: applicationQueryKeys.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sprintQueryKeys.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
  })
})
