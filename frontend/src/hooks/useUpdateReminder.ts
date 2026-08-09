import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reminderService } from '../services/reminder.service'
import { reminderQueryKeys } from './reminderQueryKeys'

type UpdateReminderVariables = {
  id: string
  completed: boolean
}

export function useUpdateReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, completed }: UpdateReminderVariables) =>
      reminderService.setCompleted(id, completed),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: reminderQueryKeys.all }),
  })
}
