import { useQuery } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import { applicationQueryKeys } from './applicationQueryKeys'
import type { ApplicationDiscoveryQuery } from '../types/application'

export function useApplications(query: ApplicationDiscoveryQuery) {
  return useQuery({
    queryKey: applicationQueryKeys.discovery(query),
    queryFn: () => applicationService.search(query),
  })
}
