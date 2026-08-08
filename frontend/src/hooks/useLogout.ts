import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '../services/auth.service'
import { sessionQueryKey } from './useSession'

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      queryClient.setQueryData(sessionQueryKey, { user: null })
      queryClient.removeQueries({ queryKey: ['applications'] })
    },
  })
}
