import { useQuery } from '@tanstack/react-query'
import { resumeVersionService } from '../services/resume-version.service'
import { resumeVersionQueryKeys } from './resumeVersionQueryKeys'

export function useResumeVersions() {
  return useQuery({
    queryKey: resumeVersionQueryKeys.all,
    queryFn: resumeVersionService.list,
  })
}
