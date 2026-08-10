import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reminderService } from '../services/reminder.service'
import type { CreateReminderInput } from '../types/reminder'
import { reminderQueryKeys } from './reminderQueryKeys'
import { useFeedback } from '../components/ui/feedback-context'

type CreateReminderVariables = {
  applicationId: string
  input: CreateReminderInput
}

export function useCreateReminder() {
  const queryClient = useQueryClient()
  const feedback = useFeedback()

  return useMutation({
    mutationFn: ({ applicationId, input }: CreateReminderVariables) =>
      reminderService.create(applicationId, input),
    onSuccess: () => {
      feedback.show('Reminder created')
      return queryClient.invalidateQueries({ queryKey: reminderQueryKeys.all })
    },
  })
}
