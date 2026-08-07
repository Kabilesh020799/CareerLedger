import { useQuery } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import { applicationQueryKeys } from './applicationQueryKeys'

export function useApplication(id: string | undefined) {
  return useQuery({
    queryKey: applicationQueryKeys.detail(id ?? ''),
    queryFn: () => applicationService.getById(id!),
    enabled: Boolean(id),
  })
}
