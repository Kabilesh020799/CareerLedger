import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import { applicationQueryKeys } from './applicationQueryKeys'
import { dashboardQueryKeys } from './dashboardQueryKeys'
import type { UpdateApplicationInput } from '../types/application'

type UpdateApplicationVariables = {
  id: string
  input: UpdateApplicationInput
}

export function useUpdateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: UpdateApplicationVariables) =>
      applicationService.update(id, input),
    onSuccess: (application) => {
      queryClient.setQueryData(applicationQueryKeys.detail(application.id), application)
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: applicationQueryKeys.events(application.id),
        }),
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
      ])
    },
  })
}
