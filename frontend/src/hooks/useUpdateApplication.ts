import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import { applicationQueryKeys } from './applicationQueryKeys'
import { dashboardQueryKeys } from './dashboardQueryKeys'
import { reminderQueryKeys } from './reminderQueryKeys'
import type { UpdateApplicationInput } from '../types/application'
import { useFeedback } from '../components/ui/feedback-context'

type UpdateApplicationVariables = {
  id: string
  input: UpdateApplicationInput
  resume?: File
}

export function useUpdateApplication() {
  const queryClient = useQueryClient()
  const feedback = useFeedback()

  return useMutation({
    mutationFn: ({ id, input, resume }: UpdateApplicationVariables) =>
      applicationService.update(id, input, resume),
    onSuccess: (application) => {
      feedback.show('Application updated', { description: `${application.jobTitle} at ${application.company}` })
      queryClient.setQueryData(applicationQueryKeys.detail(application.id), application)
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: applicationQueryKeys.events(application.id),
        }),
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: reminderQueryKeys.all }),
      ])
    },
  })
}
