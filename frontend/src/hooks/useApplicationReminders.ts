import { useQuery } from '@tanstack/react-query'
import { reminderService } from '../services/reminder.service'
import { reminderQueryKeys } from './reminderQueryKeys'

export function useApplicationReminders(applicationId: string) {
  return useQuery({
    queryKey: reminderQueryKeys.application(applicationId),
    queryFn: () => reminderService.listForApplication(applicationId),
  })
}
