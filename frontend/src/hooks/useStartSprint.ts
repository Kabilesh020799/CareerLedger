import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useFeedback } from '../components/ui/feedback-context'
import { applicationQueryKeys, sprintQueryKeys } from './applicationQueryKeys'
import { applicationService } from '../services/application.service'
import type { SprintStartResult, StartSprintInput } from '../types/application'
import { dashboardQueryKeys } from './dashboardQueryKeys'

/** Starts the next sprint and refreshes the current board and application views. */
export function useStartSprint() {
  const queryClient = useQueryClient()
  const feedback = useFeedback()

  return useMutation<SprintStartResult, Error, StartSprintInput | undefined>({
    mutationFn: (input) => applicationService.startSprint(input ?? {}),
    onSuccess: (result) => {
      const carried = `${result.carriedOverCount} application${result.carriedOverCount === 1 ? '' : 's'} carried over`
      const rejected = `${result.closedRejectedCount} rejected application${result.closedRejectedCount === 1 ? '' : 's'} closed`
      feedback.show('Sprint started', { description: `${result.sprint.name}: ${carried}; ${rejected}.` })
    },
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: sprintQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
    ]),
  })
}
