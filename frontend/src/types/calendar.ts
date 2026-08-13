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
  kind: 'DEADLINE' | 'INTERVIEW' | 'TASK' | 'EVENT' | 'REMINDER'
  applicationId: string | null
  summary: string
  description: string
  location: string | null
  startsAt: string
  endsAt: string
}

export type CreateCalendarItemInput = {
  type: 'TASK' | 'EVENT' | 'REMINDER'
  title: string
  description?: string | null
  startsAt: string
  endsAt?: string | null
  applicationId?: string | null
}
