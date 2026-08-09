import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reminderService } from '../services/reminder.service'
import type { CreateReminderInput } from '../types/reminder'
import { reminderQueryKeys } from './reminderQueryKeys'

type CreateReminderVariables = {
  applicationId: string
  input: CreateReminderInput
}

export function useCreateReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ applicationId, input }: CreateReminderVariables) =>
      reminderService.create(applicationId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: reminderQueryKeys.all }),
  })
}
