import { useQuery } from '@tanstack/react-query'
import { gmailService } from '../services/gmail.service'
import { gmailQueryKeys } from './gmailQueryKeys'

export function useGmailStatus() {
  return useQuery({
    queryKey: gmailQueryKeys.status,
    queryFn: gmailService.status,
  })
}
