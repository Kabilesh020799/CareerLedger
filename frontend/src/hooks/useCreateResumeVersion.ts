import { useMutation, useQueryClient } from '@tanstack/react-query'
import { resumeVersionService } from '../services/resume-version.service'
import { resumeVersionQueryKeys } from './resumeVersionQueryKeys'
import { dashboardQueryKeys } from './dashboardQueryKeys'
import { useFeedback } from '../components/ui/feedback-context'

export function useCreateResumeVersion() {
  const queryClient = useQueryClient()
  const feedback = useFeedback()
  return useMutation({
    mutationFn: resumeVersionService.create,
    onSuccess: (tag) => {
      feedback.show('Resume tag created', { description: tag.name })
      return Promise.all([
      queryClient.invalidateQueries({ queryKey: resumeVersionQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
      ])
    },
  })
}
