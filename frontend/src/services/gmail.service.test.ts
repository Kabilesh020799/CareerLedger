import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import { gmailService } from './gmail.service'

vi.mock('./api', () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
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
})
