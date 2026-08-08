import type { PropsWithChildren } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from '../services/auth.service'
import { useLogout } from './useLogout'
import { sessionQueryKey } from './useSession'

vi.mock('../services/auth.service', () => ({
  authService: { logout: vi.fn() },
}))

describe('useLogout', () => {
  beforeEach(() => vi.clearAllMocks())

  it('clears private cached data after the server session ends', async () => {
    vi.mocked(authService.logout).mockResolvedValue()
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const remove = vi.spyOn(queryClient, 'removeQueries')
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(useLogout, { wrapper })

    await act(() => result.current.mutateAsync())

    expect(queryClient.getQueryData(sessionQueryKey)).toEqual({ user: null })
    expect(remove).toHaveBeenCalledWith({ queryKey: ['applications'] })
  })
})
