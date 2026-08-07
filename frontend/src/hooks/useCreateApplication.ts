import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import { applicationQueryKeys } from './applicationQueryKeys'

export function useCreateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: applicationService.create,
    onSuccess: (application) => {
      queryClient.setQueryData(applicationQueryKeys.detail(application.id), application)
      return queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all })
    },
  })
}
