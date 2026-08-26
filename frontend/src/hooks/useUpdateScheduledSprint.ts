import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useFeedback } from '../components/ui/feedback-context'
import { applicationService } from '../services/application.service'
import type { Sprint, UpdateScheduledSprintInput } from '../types/application'
import { applicationQueryKeys, sprintQueryKeys } from './applicationQueryKeys'
import { dashboardQueryKeys } from './dashboardQueryKeys'

export type UpdateScheduledSprintVariables = {
  id: string
  input: UpdateScheduledSprintInput
}

/** Updates a future sprint plan and refreshes all sprint-backed views. */
export function useUpdateScheduledSprint() {
  const queryClient = useQueryClient()
  const feedback = useFeedback()

  return useMutation<Sprint, Error, UpdateScheduledSprintVariables>({
    mutationFn: ({ id, input }) => applicationService.updateScheduledSprint(id, input),
    onSuccess: (sprint) => {
      feedback.show('Sprint updated', {
        description: `${sprint.name} was updated in your upcoming sprint timeline.`,
      })
    },
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: sprintQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
    ]),
  })
}
