import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import { applicationQueryKeys } from './applicationQueryKeys'
import { dashboardQueryKeys } from './dashboardQueryKeys'
import { reminderQueryKeys } from './reminderQueryKeys'

export function useDeleteApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: applicationService.remove,
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: applicationQueryKeys.detail(id) })
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: reminderQueryKeys.all }),
      ])
    },
  })
}
