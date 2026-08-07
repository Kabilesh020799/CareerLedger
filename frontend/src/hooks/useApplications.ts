import { useQuery } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import { applicationQueryKeys } from './applicationQueryKeys'

export function useApplications() {
  return useQuery({
    queryKey: applicationQueryKeys.all,
    queryFn: applicationService.list,
  })
}
