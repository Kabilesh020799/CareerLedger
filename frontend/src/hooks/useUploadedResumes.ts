import { useQuery } from '@tanstack/react-query'
import { resumeVersionService } from '../services/resume-version.service'
import { resumeVersionQueryKeys } from './resumeVersionQueryKeys'

export function useUploadedResumes() {
  return useQuery({
    queryKey: resumeVersionQueryKeys.uploaded,
    queryFn: resumeVersionService.listUploaded,
  })
}
