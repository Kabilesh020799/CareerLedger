import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import type { CreateApplicationEventInput } from '../types/application'
import { applicationQueryKeys } from './applicationQueryKeys'
import { reminderQueryKeys } from './reminderQueryKeys'
import { useFeedback } from '../components/ui/feedback-context'

type CreateApplicationEventVariables = {
  applicationId: string
  input: CreateApplicationEventInput
}

export function useCreateApplicationEvent() {
  const queryClient = useQueryClient()
  const feedback = useFeedback()

  return useMutation({
    mutationFn: ({ applicationId, input }: CreateApplicationEventVariables) =>
      applicationService.createEvent(applicationId, input),
    onSuccess: (_event, { applicationId }) => {
      feedback.show('Note added')
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: applicationQueryKeys.events(applicationId),
        }),
        queryClient.invalidateQueries({ queryKey: reminderQueryKeys.all }),
      ])
    },
  })
}
