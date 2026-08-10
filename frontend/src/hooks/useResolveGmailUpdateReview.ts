import { useMutation, useQueryClient } from '@tanstack/react-query'
import { gmailService } from '../services/gmail.service'
import type { ResolveGmailUpdateReviewInput } from '../types/gmail'
import { applicationQueryKeys } from './applicationQueryKeys'
import { dashboardQueryKeys } from './dashboardQueryKeys'
import { gmailQueryKeys } from './gmailQueryKeys'
import { reminderQueryKeys } from './reminderQueryKeys'

type ResolveVariables = {
  id: string
  input: ResolveGmailUpdateReviewInput
}

export function useResolveGmailUpdateReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: ResolveVariables) =>
      gmailService.resolveReview(id, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: gmailQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: reminderQueryKeys.all }),
      ]),
  })
}
