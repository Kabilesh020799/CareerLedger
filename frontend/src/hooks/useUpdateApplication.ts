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
  coverLetter?: File
}

/** Updates an application and optionally replaces its private document attachments. */
export function useUpdateApplication() {
  const queryClient = useQueryClient()
  const feedback = useFeedback()

  return useMutation({
    mutationFn: ({ id, input, resume, coverLetter }: UpdateApplicationVariables) =>
      applicationService.update(id, input, { resume, coverLetter }),
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
