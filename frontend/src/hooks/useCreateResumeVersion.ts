import { useMutation, useQueryClient } from '@tanstack/react-query'
import { resumeVersionService } from '../services/resume-version.service'
import { resumeVersionQueryKeys } from './resumeVersionQueryKeys'
import { dashboardQueryKeys } from './dashboardQueryKeys'

export function useCreateResumeVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: resumeVersionService.create,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: resumeVersionQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
    ]),
  })
}
