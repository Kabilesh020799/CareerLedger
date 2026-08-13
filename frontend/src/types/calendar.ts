/** Calendar subscription metadata; the bearer URL is intentionally returned only on creation. */
export type CalendarSubscriptionStatus = {
  active: boolean
  createdAt: string | null
}

export type CreatedCalendarSubscription = {
  url: string
}
