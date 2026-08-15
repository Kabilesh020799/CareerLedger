import type { PropsWithChildren } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from '../services/auth.service'
import { usePasswordLogin } from './usePasswordLogin'
import { sessionQueryKey } from './useSession'

vi.mock('../services/auth.service', () => ({
  authService: { login: vi.fn() },
}))

describe('usePasswordLogin', () => {
  beforeEach(() => vi.clearAllMocks())

  it('stores the authenticated session after a successful login', async () => {
    const session = {
      user: {
        id: 'demo-user',
        username: 'demo',
        email: 'demo@jobtracker.local',
        name: 'Demo User',
      avatarUrl: null,
        emailVerifiedAt: null,
        isAdmin: false,
      },
    }
    vi.mocked(authService.login).mockResolvedValue(session)
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(usePasswordLogin, { wrapper })

    await act(() =>
      result.current.mutateAsync({ username: 'demo', password: 'ValidTestPassword1' }),
    )

    expect(queryClient.getQueryData(sessionQueryKey)).toEqual(session)
  })
})
