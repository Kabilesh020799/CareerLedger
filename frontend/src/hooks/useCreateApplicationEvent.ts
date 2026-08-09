import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import type { CreateApplicationEventInput } from '../types/application'
import { applicationQueryKeys } from './applicationQueryKeys'
import { reminderQueryKeys } from './reminderQueryKeys'

type CreateApplicationEventVariables = {
  applicationId: string
  input: CreateApplicationEventInput
}

export function useCreateApplicationEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ applicationId, input }: CreateApplicationEventVariables) =>
      applicationService.createEvent(applicationId, input),
    onSuccess: (_event, { applicationId }) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: applicationQueryKeys.events(applicationId),
        }),
        queryClient.invalidateQueries({ queryKey: reminderQueryKeys.all }),
      ]),
  })
}
