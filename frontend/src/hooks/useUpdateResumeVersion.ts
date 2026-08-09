import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationQueryKeys } from './applicationQueryKeys'
import { resumeVersionService } from '../services/resume-version.service'
import { resumeVersionQueryKeys } from './resumeVersionQueryKeys'
import type { UpdateResumeVersionInput } from '../types/resume'

export function useUpdateResumeVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateResumeVersionInput }) =>
      resumeVersionService.update(id, input),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: resumeVersionQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all }),
    ]),
  })
}
