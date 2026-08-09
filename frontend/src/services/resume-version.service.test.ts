import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import { resumeVersionService } from './resume-version.service'

vi.mock('./api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

describe('resumeVersionService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists, creates, updates, and deletes resume versions', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'resume-1' } })
    vi.mocked(api.patch).mockResolvedValue({ data: { id: 'resume-1' } })
    vi.mocked(api.delete).mockResolvedValue({})

    await resumeVersionService.list()
    await resumeVersionService.create({ name: 'Full-stack resume' })
    await resumeVersionService.update('resume-1', { name: 'Backend resume' })
    await resumeVersionService.remove('resume-1')

    expect(api.get).toHaveBeenCalledWith('/resumes')
    expect(api.post).toHaveBeenCalledWith('/resumes', { name: 'Full-stack resume' })
    expect(api.patch).toHaveBeenCalledWith('/resumes/resume-1', {
      name: 'Backend resume',
    })
    expect(api.delete).toHaveBeenCalledWith('/resumes/resume-1')
  })
})
