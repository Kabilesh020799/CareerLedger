import { useQuery } from '@tanstack/react-query'
import { authService } from '../services/auth.service'

export const sessionQueryKey = ['auth', 'session'] as const

export function useSession() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: authService.session,
    staleTime: 30_000,
    retry: false,
  })
}
