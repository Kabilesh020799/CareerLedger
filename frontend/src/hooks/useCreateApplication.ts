import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import { applicationQueryKeys } from './applicationQueryKeys'
import { dashboardQueryKeys } from './dashboardQueryKeys'
import type { CreateApplicationRequest } from '../types/application'

/** Creates an application and refreshes application and dashboard queries on success. */
export function useCreateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ input, resume }: CreateApplicationRequest) =>
      applicationService.create(input, resume),
    onSuccess: (application) => {
      queryClient.setQueryData(applicationQueryKeys.detail(application.id), application)
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
      ])
    },
  })
}
