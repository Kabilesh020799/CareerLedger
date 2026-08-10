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
      feedback.show('Gmail sync started', { description: 'New recruitment updates will appear for review.' })
      return queryClient.invalidateQueries({ queryKey: gmailQueryKeys.all })
    },
  })
}
