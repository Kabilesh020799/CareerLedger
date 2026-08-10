import { useMutation, useQueryClient } from '@tanstack/react-query'
import { gmailService } from '../services/gmail.service'
import { gmailQueryKeys } from './gmailQueryKeys'

/** Saves the Gmail worker schedule and refreshes its public status. */
export function useUpdateGmailSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: gmailService.updateSchedule,
    onSuccess: (status) => queryClient.setQueryData(gmailQueryKeys.status, status),
  })
}
