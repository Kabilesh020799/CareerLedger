import type { PropsWithChildren } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { applicationService } from '../services/application.service'
import { applicationQueryKeys, sprintQueryKeys } from './applicationQueryKeys'
import { useCancelScheduledSprint } from './useCancelScheduledSprint'

vi.mock('../services/application.service', () => ({
  applicationService: { cancelScheduledSprint: vi.fn() },
}))

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

describe('useCancelScheduledSprint', () => {
  beforeEach(() => vi.clearAllMocks())

  it('cancels a scheduled sprint and refreshes sprint-backed views', async () => {
    vi.mocked(applicationService.cancelScheduledSprint).mockResolvedValue(undefined)
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(useCancelScheduledSprint, { wrapper })

    await act(() => result.current.mutateAsync('sprint-scheduled'))

    expect(applicationService.cancelScheduledSprint).toHaveBeenCalledWith('sprint-scheduled')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: applicationQueryKeys.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sprintQueryKeys.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
  })
})
