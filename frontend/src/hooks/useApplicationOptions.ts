import { useQuery } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import { applicationQueryKeys } from './applicationQueryKeys'

export function useApplicationOptions(enabled = true) {
  return useQuery({
    queryKey: applicationQueryKeys.options,
    queryFn: applicationService.list,
    enabled,
  })
}
