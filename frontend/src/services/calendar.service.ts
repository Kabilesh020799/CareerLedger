import type { CalendarEvent, CalendarSubscriptionStatus, CreateCalendarItemInput, CreatedCalendarSubscription } from '../types/calendar'
import { api } from './api'

function saveCalendar(data: BlobPart, fileName: string) {
  const url = URL.createObjectURL(new Blob([data], { type: 'text/calendar;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export const calendarService = {
  async listEvents() {
    return (await api.get<CalendarEvent[]>('/calendar/events')).data
  },
  async createItem(input: CreateCalendarItemInput) {
    return (await api.post('/calendar/items', input)).data
  },
  async getSubscription() {
    const response = await api.get<CalendarSubscriptionStatus>('/calendar/subscription')
    return response.data
  },

  async createSubscription() {
    const response = await api.post<CreatedCalendarSubscription>('/calendar/subscription')
    return response.data
  },

  async revokeSubscription() {
    await api.delete('/calendar/subscription')
  },

  async downloadCalendar() {
    const response = await api.get<Blob>('/calendar/export', { responseType: 'blob' })
    saveCalendar(response.data, 'job-tracker.ics')
  },

  async downloadReminder(reminderId: string) {
    const response = await api.get<Blob>(`/calendar/reminders/${reminderId}.ics`, { responseType: 'blob' })
    saveCalendar(response.data, 'job-tracker-deadline.ics')
  },
}
