import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import { gmailService } from './gmail.service'

vi.mock('./api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  apiBaseUrl: 'http://localhost:3000/api',
}))

describe('gmailService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads status, waits for a queued synchronization, and disconnects through the Gmail API', async () => {
    const status = { configured: true, connected: false }
    const synchronization = {
      synchronizationType: 'incremental' as const,
      fetchedMessages: 3,
      newMessages: 2,
      duplicateMessages: 1,
      analyzedMessages: 3,
      detectedUpdates: 1,
      lastSyncedAt: '2026-08-17T12:00:00.000Z',
    }
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: status })
      .mockResolvedValueOnce({
        data: { jobId: 'gmail-job-1', status: 'completed', result: synchronization },
      })
    vi.mocked(api.post).mockResolvedValue({ data: { jobId: 'gmail-job-1', status: 'queued' } })
    vi.mocked(api.delete).mockResolvedValue({})

    await expect(gmailService.status()).resolves.toEqual(status)
    await expect(gmailService.synchronize()).resolves.toEqual(synchronization)
    await expect(gmailService.disconnect()).resolves.toBeUndefined()

    expect(api.get).toHaveBeenCalledWith('/gmail/status')
    expect(api.post).toHaveBeenCalledWith('/gmail/sync')
    expect(api.get).toHaveBeenCalledWith('/gmail/sync/gmail-job-1')
    expect(api.delete).toHaveBeenCalledWith('/gmail/connection')
  })

  it('surfaces the safe failure returned by a background synchronization', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { jobId: 'gmail-job-2', status: 'queued' } })
    vi.mocked(api.get).mockResolvedValue({
      data: {
        jobId: 'gmail-job-2',
        status: 'failed',
        error: 'Gmail synchronization failed after retrying.',
      },
    })

    await expect(gmailService.synchronize()).rejects.toThrow(
      'Gmail synchronization failed after retrying.',
    )
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
