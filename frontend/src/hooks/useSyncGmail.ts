import { useMutation, useQueryClient } from '@tanstack/react-query'
import { gmailService } from '../services/gmail.service'
import { gmailQueryKeys } from './gmailQueryKeys'
import { useFeedback } from '../components/ui/feedback-context'

export function useSyncGmail() {
  const queryClient = useQueryClient()
  const feedback = useFeedback()
  return useMutation({
    mutationFn: gmailService.synchronize,
    onSuccess: () => {
      feedback.show('Gmail sync complete', { description: 'New recruitment updates are ready for review.' })
      return queryClient.invalidateQueries({ queryKey: gmailQueryKeys.all })
    },
  })
}
