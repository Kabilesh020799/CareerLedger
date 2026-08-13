import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { calendarService } from '../services/calendar.service'

const calendarSubscriptionKey = ['calendar', 'subscription'] as const

export function useCalendarSubscription() {
  return useQuery({ queryKey: calendarSubscriptionKey, queryFn: calendarService.getSubscription })
}

export function useCreateCalendarSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: calendarService.createSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarSubscriptionKey }),
  })
}

export function useRevokeCalendarSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: calendarService.revokeSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarSubscriptionKey }),
  })
}

export function useDownloadCalendar() {
  return useMutation({ mutationFn: calendarService.downloadCalendar })
}
