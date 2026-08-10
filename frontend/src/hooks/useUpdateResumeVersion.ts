import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationQueryKeys } from './applicationQueryKeys'
import { resumeVersionService } from '../services/resume-version.service'
import { resumeVersionQueryKeys } from './resumeVersionQueryKeys'
import type { UpdateResumeVersionInput } from '../types/resume'
import { dashboardQueryKeys } from './dashboardQueryKeys'
import { useFeedback } from '../components/ui/feedback-context'

export function useUpdateResumeVersion() {
  const queryClient = useQueryClient()
  const feedback = useFeedback()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateResumeVersionInput }) =>
      resumeVersionService.update(id, input),
    onSuccess: (tag) => {
      feedback.show('Resume tag updated', { description: tag.name })
      return Promise.all([
      queryClient.invalidateQueries({ queryKey: resumeVersionQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
      ])
    },
  })
}
