import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import { calendarService } from './calendar.service'

vi.mock('./api', () => ({ api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

describe('calendarService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads, creates, and revokes calendar subscriptions', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { active: false, createdAt: null } })
    vi.mocked(api.post).mockResolvedValue({ data: { url: 'https://example.test/feed' } })
    await expect(calendarService.getSubscription()).resolves.toEqual({ active: false, createdAt: null })
    await expect(calendarService.createSubscription()).resolves.toEqual({ url: 'https://example.test/feed' })
    await calendarService.revokeSubscription()
    expect(api.get).toHaveBeenCalledWith('/calendar/subscription')
    expect(api.post).toHaveBeenCalledWith('/calendar/subscription')
    expect(api.delete).toHaveBeenCalledWith('/calendar/subscription')
  })
})
