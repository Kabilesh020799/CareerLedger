import { useMutation, useQueryClient } from '@tanstack/react-query'
import { gmailService } from '../services/gmail.service'
import { gmailQueryKeys } from './gmailQueryKeys'

export function useDisconnectGmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: gmailService.disconnect,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gmailQueryKeys.all }),
  })
}
