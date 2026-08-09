import { useQuery } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import { applicationQueryKeys } from './applicationQueryKeys'

export function useApplicationBoard() {
  return useQuery({
    queryKey: applicationQueryKeys.board,
    queryFn: () => applicationService.list(),
  })
}
