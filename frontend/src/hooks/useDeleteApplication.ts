import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import { applicationQueryKeys } from './applicationQueryKeys'

export function useDeleteApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: applicationService.remove,
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: applicationQueryKeys.detail(id) })
      return queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all })
    },
  })
}
