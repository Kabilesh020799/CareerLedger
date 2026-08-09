import type { Reminder, ReminderWithApplication } from '../types/reminder'

export function isReminderOverdue(reminder: Reminder, now = new Date()) {
  return !reminder.completedAt && new Date(reminder.dueAt).getTime() < now.getTime()
}

export function partitionOpenReminders(
  reminders: ReminderWithApplication[],
  now = new Date(),
) {
  return {
    overdue: reminders.filter((reminder) => isReminderOverdue(reminder, now)),
    upcoming: reminders.filter((reminder) => !isReminderOverdue(reminder, now)),
  }
}

export function formatReminderDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
