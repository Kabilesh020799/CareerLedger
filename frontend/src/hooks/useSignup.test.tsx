import type { PropsWithChildren } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from '../services/auth.service'
import { useSignup } from './useSignup'
import { sessionQueryKey } from './useSession'

vi.mock('../services/auth.service', () => ({ authService: { signup: vi.fn() } }))

describe('useSignup', () => {
  beforeEach(() => vi.clearAllMocks())

  it('stores the authenticated session after account creation', async () => {
    const session = {
      user: {
        id: 'user-1',
        username: 'new_user',
        email: 'person@example.com',
        name: 'New User',
        avatarUrl: null,
      },
    }
    vi.mocked(authService.signup).mockResolvedValue(session)
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(useSignup, { wrapper })

    await act(() => result.current.mutateAsync({
      name: 'New User',
      username: 'new_user',
      email: 'person@example.com',
      password: 'SecurePassword1',
    }))

    expect(queryClient.getQueryData(sessionQueryKey)).toEqual(session)
  })
})
