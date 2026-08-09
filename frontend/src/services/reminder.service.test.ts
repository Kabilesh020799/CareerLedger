import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import { reminderService } from './reminder.service'

vi.mock('./api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

describe('reminderService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists application reminders, open reminders, and follow-up suggestions', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })

    await reminderService.listForApplication('application-1')
    await reminderService.listOpen()
    await reminderService.listFollowUpSuggestions()

    expect(api.get).toHaveBeenNthCalledWith(
      1,
      '/applications/application-1/reminders',
    )
    expect(api.get).toHaveBeenNthCalledWith(2, '/reminders')
    expect(api.get).toHaveBeenNthCalledWith(3, '/reminders/suggestions')
  })

  it('creates, completes, reopens, and deletes reminders', async () => {
    const input = {
      type: 'FOLLOW_UP' as const,
      description: 'Contact recruiter',
      dueAt: '2099-08-15T13:30:00.000Z',
    }
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'reminder-1' } })
    vi.mocked(api.patch).mockResolvedValue({ data: { id: 'reminder-1' } })
    vi.mocked(api.delete).mockResolvedValue({})

    await reminderService.create('application-1', input)
    await reminderService.createSuggestedFollowUp('application-1')
    await reminderService.setCompleted('reminder-1', true)
    await reminderService.setCompleted('reminder-1', false)
    await reminderService.remove('reminder-1')

    expect(api.post).toHaveBeenNthCalledWith(
      1,
      '/applications/application-1/reminders',
      input,
    )
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      '/reminders/suggestions/application-1',
    )
    expect(api.patch).toHaveBeenNthCalledWith(1, '/reminders/reminder-1', {
      completed: true,
    })
    expect(api.patch).toHaveBeenNthCalledWith(2, '/reminders/reminder-1', {
      completed: false,
    })
    expect(api.delete).toHaveBeenCalledWith('/reminders/reminder-1')
  })
})
