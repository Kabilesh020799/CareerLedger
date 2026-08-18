import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import { applicationQueryKeys } from './applicationQueryKeys'
import { dashboardQueryKeys } from './dashboardQueryKeys'
import type { CreateApplicationRequest } from '../types/application'
import { useFeedback } from '../components/ui/feedback-context'

/** Creates an application and refreshes application and dashboard queries on success. */
export function useCreateApplication() {
  const queryClient = useQueryClient()
  const feedback = useFeedback()

  return useMutation({
    mutationFn: ({ input, resume, coverLetter }: CreateApplicationRequest) =>
      applicationService.create(input, { resume, coverLetter }),
    onSuccess: (application) => {
      feedback.show('Application created', { description: `${application.jobTitle} at ${application.company}` })
      queryClient.setQueryData(applicationQueryKeys.detail(application.id), application)
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
      ])
    },
  })
}
