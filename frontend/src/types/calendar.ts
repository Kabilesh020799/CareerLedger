/** Calendar subscription metadata; the bearer URL is intentionally returned only on creation. */
export type CalendarSubscriptionStatus = {
  active: boolean
  createdAt: string | null
}

export type CreatedCalendarSubscription = {
  url: string
}

/** Deadline or interview milestone displayed on the in-app calendar. */
export type CalendarEvent = {
  uid: string
  kind: 'DEADLINE' | 'INTERVIEW'
  applicationId: string
  summary: string
  description: string
  location: string | null
  startsAt: string
  endsAt: string
}
