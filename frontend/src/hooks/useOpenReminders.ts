import { useQuery } from '@tanstack/react-query'
import { reminderService } from '../services/reminder.service'
import { reminderQueryKeys } from './reminderQueryKeys'

export function useOpenReminders() {
  return useQuery({
    queryKey: reminderQueryKeys.open,
    queryFn: () => reminderService.listOpen(),
  })
}
