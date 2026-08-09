export const reminderTypes = ['FOLLOW_UP', 'DEADLINE'] as const

export type ReminderType = (typeof reminderTypes)[number]

export type Reminder = {
  id: string
  applicationId: string
  type: ReminderType
  description: string
  dueAt: string
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ReminderWithApplication = Reminder & {
  application: {
    id: string
    company: string
    jobTitle: string
  }
}

export type CreateReminderInput = {
  type: ReminderType
  description: string
  dueAt: string
}
