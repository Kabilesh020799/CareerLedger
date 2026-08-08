import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '../services/auth.service'
import { sessionQueryKey } from './useSession'

export function usePasswordLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authService.login,
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryKey, session)
    },
  })
}
