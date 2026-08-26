import type { PropsWithChildren } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { applicationService } from '../services/application.service'
import { applicationQueryKeys, sprintQueryKeys } from './applicationQueryKeys'
import { useUpdateScheduledSprint } from './useUpdateScheduledSprint'

vi.mock('../services/application.service', () => ({
  applicationService: { updateScheduledSprint: vi.fn() },
}))

const updatedSprint = {
  id: 'sprint-scheduled',
  userId: 'user-1',
  workspaceId: 'workspace-1',
  name: 'Interview push revised',
  sequence: 2,
  status: 'SCHEDULED' as const,
  scheduledStartAt: '2026-09-03T13:00:00.000Z',
  durationDays: 21,
  startedAt: '2026-08-24T13:00:00.000Z',
  endsAt: '2026-09-24T13:00:00.000Z',
  closedAt: null,
  createdAt: '2026-08-24T13:00:00.000Z',
  updatedAt: '2026-08-25T13:00:00.000Z',
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

describe('useUpdateScheduledSprint', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates a scheduled sprint and refreshes sprint-backed views', async () => {
    vi.mocked(applicationService.updateScheduledSprint).mockResolvedValue(updatedSprint)
    const variables = {
      id: updatedSprint.id,
      input: {
        name: updatedSprint.name,
        durationDays: updatedSprint.durationDays,
        startsAt: updatedSprint.scheduledStartAt,
      },
    }
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(useUpdateScheduledSprint, { wrapper })

    await act(() => result.current.mutateAsync(variables))

    expect(applicationService.updateScheduledSprint).toHaveBeenCalledWith(variables.id, variables.input)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: applicationQueryKeys.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sprintQueryKeys.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
  })
})
