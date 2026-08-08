import { useQuery } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import { applicationQueryKeys } from './applicationQueryKeys'

export function useApplicationEvents(id: string) {
  return useQuery({
    queryKey: applicationQueryKeys.events(id),
    queryFn: () => applicationService.listEvents(id),
  })
}
