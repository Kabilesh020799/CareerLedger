import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { calendarService } from '../services/calendar.service'
import type { CreateCalendarItemInput } from '../types/calendar'

const calendarSubscriptionKey = ['calendar', 'subscription'] as const
const calendarEventsKey = ['calendar', 'events'] as const

export function useCalendarEvents() {
  return useQuery({ queryKey: calendarEventsKey, queryFn: calendarService.listEvents })
}

export function useCreateCalendarItem() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (input: CreateCalendarItemInput) => calendarService.createItem(input), onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarEventsKey }) })
}

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
