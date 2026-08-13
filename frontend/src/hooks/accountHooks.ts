import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountService } from '../services/account.service'
import type { DeleteAccountInput, ProfileInput } from '../schemas/account.schema'
import { sessionQueryKey } from './useSession'

export const accountQueryKey = ['account'] as const

export function useAccountProfile() {
  return useQuery({ queryKey: accountQueryKey, queryFn: accountService.profile })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProfileInput) => accountService.updateProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(accountQueryKey, profile)
      queryClient.invalidateQueries({ queryKey: sessionQueryKey })
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DeleteAccountInput) => accountService.deleteAccount(input),
    onSuccess: () => queryClient.clear(),
  })
}

export function useResendEmailVerification() {
  return useMutation({
    mutationFn: (email: string) => accountService.resendVerification(email),
  })
}
