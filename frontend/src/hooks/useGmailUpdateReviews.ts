import { useQuery } from '@tanstack/react-query'
import { gmailService } from '../services/gmail.service'
import { gmailQueryKeys } from './gmailQueryKeys'

export function useGmailUpdateReviews(enabled = true) {
  return useQuery({
    queryKey: gmailQueryKeys.reviews,
    queryFn: gmailService.listReviews,
    enabled,
  })
}
