import { useMutation, useQueryClient } from '@tanstack/react-query'
import { gmailService } from '../services/gmail.service'
import { gmailQueryKeys } from './gmailQueryKeys'

export function useSyncGmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: gmailService.synchronize,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gmailQueryKeys.all }),
  })
}
