import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '../services/auth.service'
import { sessionQueryKey } from './useSession'

/** Creates an account and stores the authenticated session returned by the API. */
export function useSignup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authService.signup,
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryKey, session)
    },
  })
}
