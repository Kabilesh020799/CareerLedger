import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reminderService } from '../services/reminder.service'
import { reminderQueryKeys } from './reminderQueryKeys'

export function useDeleteReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => reminderService.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: reminderQueryKeys.all }),
  })
}
