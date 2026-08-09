export const reminderQueryKeys = {
  all: ['reminders'] as const,
  open: ['reminders', 'open'] as const,
  application: (applicationId: string) =>
    ['reminders', 'application', applicationId] as const,
}
