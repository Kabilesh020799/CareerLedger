import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import { gmailService } from './gmail.service'

vi.mock('./api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  apiBaseUrl: 'http://localhost:3000/api',
}))

describe('gmailService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads status, synchronizes, and disconnects through the Gmail API', async () => {
    const status = { configured: true, connected: false }
    const synchronization = { newMessages: 2, duplicateMessages: 1 }
    vi.mocked(api.get).mockResolvedValue({ data: status })
    vi.mocked(api.post).mockResolvedValue({ data: synchronization })
    vi.mocked(api.delete).mockResolvedValue({})

    await expect(gmailService.status()).resolves.toEqual(status)
    await expect(gmailService.synchronize()).resolves.toEqual(synchronization)
    await expect(gmailService.disconnect()).resolves.toBeUndefined()

    expect(api.get).toHaveBeenCalledWith('/gmail/status')
    expect(api.post).toHaveBeenCalledWith('/gmail/sync')
    expect(api.delete).toHaveBeenCalledWith('/gmail/connection')
  })

  it('lists and resolves private Gmail update reviews', async () => {
    const reviews = [{ id: 'review-1', suggestedStatus: 'INTERVIEW' }]
    const resolved = { review: { id: 'review-1', status: 'CONFIRMED' } }
    vi.mocked(api.get).mockResolvedValue({ data: reviews })
    vi.mocked(api.patch).mockResolvedValue({ data: resolved })

    await expect(gmailService.listReviews()).resolves.toEqual(reviews)
    await expect(
      gmailService.resolveReview('review-1', {
        action: 'CONFIRM',
        applicationId: 'application-1',
        status: 'INTERVIEW',
      }),
    ).resolves.toEqual(resolved)

    expect(api.get).toHaveBeenCalledWith('/gmail/reviews')
    expect(api.patch).toHaveBeenCalledWith('/gmail/reviews/review-1', {
      action: 'CONFIRM',
      applicationId: 'application-1',
      status: 'INTERVIEW',
    })
  })
})
