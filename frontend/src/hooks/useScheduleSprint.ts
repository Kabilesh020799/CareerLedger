import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useFeedback } from '../components/ui/feedback-context'
import { applicationQueryKeys, sprintQueryKeys } from './applicationQueryKeys'
import { applicationService } from '../services/application.service'
import type { ScheduleSprintInput, Sprint } from '../types/application'
import { dashboardQueryKeys } from './dashboardQueryKeys'

/** Schedules a future sprint and refreshes all sprint-backed application views. */
export function useScheduleSprint() {
  const queryClient = useQueryClient()
  const feedback = useFeedback()

  return useMutation<Sprint, Error, ScheduleSprintInput>({
    mutationFn: (input) => applicationService.scheduleSprint(input),
    onSuccess: (sprint) => {
      feedback.show('Sprint scheduled', {
        description: `${sprint.name} is ready for its planned start time.`,
      })
    },
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: sprintQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
    ]),
  })
}
