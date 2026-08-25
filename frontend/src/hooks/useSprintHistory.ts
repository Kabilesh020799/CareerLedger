import { useQuery } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import { sprintQueryKeys } from './applicationQueryKeys'

/** Loads sprint history in the newest-first order provided by the API. */
export function useSprintHistory() {
  return useQuery({
    queryKey: sprintQueryKeys.history,
    queryFn: applicationService.listSprints,
  })
}
