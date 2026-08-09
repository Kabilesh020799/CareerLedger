import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationQueryKeys } from './applicationQueryKeys'
import { resumeVersionService } from '../services/resume-version.service'
import { resumeVersionQueryKeys } from './resumeVersionQueryKeys'

export function useDeleteResumeVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: resumeVersionService.remove,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: resumeVersionQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all }),
    ]),
  })
}
