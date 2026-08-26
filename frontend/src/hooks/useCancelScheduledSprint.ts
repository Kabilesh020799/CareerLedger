import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useFeedback } from '../components/ui/feedback-context'
import { applicationService } from '../services/application.service'
import { applicationQueryKeys, sprintQueryKeys } from './applicationQueryKeys'
import { dashboardQueryKeys } from './dashboardQueryKeys'

/** Cancels a future sprint plan and refreshes all sprint-backed views. */
export function useCancelScheduledSprint() {
  const queryClient = useQueryClient()
  const feedback = useFeedback()

  return useMutation<void, Error, string>({
    mutationFn: (id) => applicationService.cancelScheduledSprint(id),
    onSuccess: () => {
      feedback.show('Sprint canceled', {
        description: 'The sprint was removed from your upcoming timeline.',
      })
    },
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: sprintQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
    ]),
  })
}
