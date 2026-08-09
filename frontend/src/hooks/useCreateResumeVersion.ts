import { useMutation, useQueryClient } from '@tanstack/react-query'
import { resumeVersionService } from '../services/resume-version.service'
import { resumeVersionQueryKeys } from './resumeVersionQueryKeys'

export function useCreateResumeVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: resumeVersionService.create,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: resumeVersionQueryKeys.all }),
  })
}
