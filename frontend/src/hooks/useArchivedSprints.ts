import { useQuery } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import { sprintQueryKeys } from './applicationQueryKeys'

/** Loads applications grouped under their closed sprint. */
export function useArchivedSprints() {
  return useQuery({
    queryKey: sprintQueryKeys.archived,
    queryFn: applicationService.listArchivedSprints,
  })
}
