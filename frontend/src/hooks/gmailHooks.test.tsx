import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { gmailService } from '../services/gmail.service'
import { gmailQueryKeys } from './gmailQueryKeys'
import { useDisconnectGmail } from './useDisconnectGmail'
import { useGmailStatus } from './useGmailStatus'
import { useSyncGmail } from './useSyncGmail'

vi.mock('../services/gmail.service', () => ({
  gmailService: {
    status: vi.fn(),
    synchronize: vi.fn(),
    disconnect: vi.fn(),
  },
}))

describe('Gmail hooks', () => {
  let queryClient: QueryClient
  let wrapper: ({ children }: PropsWithChildren) => React.JSX.Element

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  })

  it('loads Gmail connection status', async () => {
    vi.mocked(gmailService.status).mockResolvedValue({
      configured: true,
      connected: false,
      gmailEmail: null,
      lastSyncedAt: null,
      synchronizedMessages: 0,
    })

    const { result } = renderHook(useGmailStatus, { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.configured).toBe(true)
  })

  it('refreshes Gmail status after synchronization and disconnection', async () => {
    vi.mocked(gmailService.synchronize).mockResolvedValue({
      synchronizationType: 'incremental',
      fetchedMessages: 1,
      newMessages: 1,
      duplicateMessages: 0,
      lastSyncedAt: '2026-08-09T21:00:00.000Z',
    })
    vi.mocked(gmailService.disconnect).mockResolvedValue()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const syncHook = renderHook(useSyncGmail, { wrapper })
    const disconnectHook = renderHook(useDisconnectGmail, { wrapper })

    await act(() => syncHook.result.current.mutateAsync())
    await act(() => disconnectHook.result.current.mutateAsync())

    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: gmailQueryKeys.all })
  })
})
