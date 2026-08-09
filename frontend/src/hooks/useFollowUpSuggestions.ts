import { useQuery } from '@tanstack/react-query'
import { reminderService } from '../services/reminder.service'
import { reminderQueryKeys } from './reminderQueryKeys'

export function useFollowUpSuggestions() {
  return useQuery({
    queryKey: reminderQueryKeys.suggestions,
    queryFn: reminderService.listFollowUpSuggestions,
  })
}
