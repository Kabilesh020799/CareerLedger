import type {
  CreateReminderInput,
  FollowUpSuggestion,
  Reminder,
  ReminderWithApplication,
} from '../types/reminder'
import { api } from './api'

export const reminderService = {
  async listForApplication(applicationId: string) {
    const response = await api.get<Reminder[]>(
      `/applications/${applicationId}/reminders`,
    )
    return response.data
  },

  async listOpen() {
    const response = await api.get<ReminderWithApplication[]>('/reminders')
    return response.data
  },

  async listFollowUpSuggestions() {
    const response = await api.get<FollowUpSuggestion[]>('/reminders/suggestions')
    return response.data
  },

  async createSuggestedFollowUp(applicationId: string) {
    const response = await api.post<Reminder>(
      `/reminders/suggestions/${applicationId}`,
    )
    return response.data
  },

  async create(applicationId: string, input: CreateReminderInput) {
    const response = await api.post<Reminder>(
      `/applications/${applicationId}/reminders`,
      input,
    )
    return response.data
  },

  async setCompleted(id: string, completed: boolean) {
    const response = await api.patch<Reminder>(`/reminders/${id}`, {
      completed,
    })
    return response.data
  },

  async remove(id: string) {
    await api.delete(`/reminders/${id}`)
  },
}
