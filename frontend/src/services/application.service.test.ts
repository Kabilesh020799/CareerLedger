import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { api } from './api'
import { applicationService } from './application.service'

vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const application = {
  id: 'application-1',
  company: 'Acme Corp',
  jobTitle: 'Software Engineer',
  location: null,
  jobUrl: null,
  source: null,
  status: 'SAVED' as const,
  notes: null,
  appliedAt: null,
  createdAt: '2026-08-06T12:00:00.000Z',
  updatedAt: '2026-08-06T12:00:00.000Z',
}

const event = {
  id: 'event-1',
  applicationId: 'application-1',
  type: 'NOTE' as const,
  description: 'Followed up with the recruiter.',
  fromStatus: null,
  toStatus: null,
  occurredAt: '2026-08-07T00:00:00.000Z',
  createdAt: '2026-08-07T15:30:00.000Z',
}

describe('applicationService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads large application lists through bounded pages', async () => {
    const secondApplication = { ...application, id: 'application-2' }
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: {
          data: [application],
          pagination: { page: 1, limit: 50, total: 51, pages: 2 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [secondApplication],
          pagination: { page: 2, limit: 50, total: 51, pages: 2 },
        },
      })

    await expect(applicationService.list()).resolves.toEqual([
      application,
      secondApplication,
    ])
    expect(api.get).toHaveBeenNthCalledWith(1, '/applications/search', {
      params: { sortBy: 'createdAt', sortOrder: 'desc', page: 1, limit: 50 },
    })
    expect(api.get).toHaveBeenNthCalledWith(2, '/applications/search', {
      params: { sortBy: 'createdAt', sortOrder: 'desc', page: 2, limit: 50 },
    })
  })

  it('searches applications with server-side discovery parameters', async () => {
    const query = {
      search: 'Acme',
      sortBy: 'company' as const,
      sortOrder: 'asc' as const,
      page: 2,
      limit: 10,
    }
    const result = {
      data: [application],
      pagination: { page: 2, limit: 10, total: 12, pages: 2 },
    }
    vi.mocked(api.get).mockResolvedValue({ data: result })

    await expect(applicationService.search(query)).resolves.toEqual(result)
    expect(api.get).toHaveBeenCalledWith('/applications/search', { params: query })
  })

  it('creates an application through the API', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: application })
    const input = { company: 'Acme Corp', jobTitle: 'Software Engineer' }

    await expect(applicationService.create(input)).resolves.toEqual(application)
    expect(api.post).toHaveBeenCalledWith('/applications', input)
  })

  it('keeps database uploads available when S3 is not configured', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { mode: 'database' } })
      .mockResolvedValueOnce({ data: application })
    const input = { company: 'Acme Corp', jobTitle: 'Software Engineer', notes: null }
    const resume = new File(['resume'], 'current.pdf', { type: 'application/pdf' })

    await applicationService.create(input, resume)

    expect(api.post).toHaveBeenNthCalledWith(1, '/applications/resume-uploads', {
      fileName: 'current.pdf',
      mimeType: 'application/pdf',
      size: resume.size,
    })
    const requestBody = vi.mocked(api.post).mock.calls[1][1]
    expect(requestBody).toBeInstanceOf(FormData)
    expect((requestBody as FormData).get('company')).toBe('Acme Corp')
    expect((requestBody as FormData).get('jobTitle')).toBe('Software Engineer')
    expect((requestBody as FormData).get('notes')).toBeNull()
    expect((requestBody as FormData).get('resume')).toBe(resume)
  })

  it('uploads a new application resume directly to S3 before saving', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({
        data: {
          mode: 's3',
          storageKey: 'resumes/pending/user-1/upload.pdf',
          url: 'https://jatbucket2799.s3.amazonaws.com',
          fields: { key: 'resumes/pending/user-1/upload.pdf' },
          expiresAt: '2026-08-10T03:00:00.000Z',
        },
      })
      .mockResolvedValueOnce({ data: application })
    vi.mocked(axios.post).mockResolvedValue({ status: 204 })
    const input = { company: 'Acme Corp', jobTitle: 'Software Engineer' }
    const resume = new File(['resume'], 'current.pdf', { type: 'application/pdf' })

    await expect(applicationService.create(input, resume)).resolves.toEqual(application)

    expect(axios.post).toHaveBeenCalledWith(
      'https://jatbucket2799.s3.amazonaws.com',
      expect.any(FormData),
      { withCredentials: false },
    )
    expect(api.post).toHaveBeenNthCalledWith(2, '/applications', {
      ...input,
      resumeUploadKey: 'resumes/pending/user-1/upload.pdf',
    })
  })

  it('updates and deletes an application through the API', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { ...application, status: 'INTERVIEW' } })
    vi.mocked(api.delete).mockResolvedValue({})

    await applicationService.update(application.id, { status: 'INTERVIEW' })
    await applicationService.remove(application.id)

    expect(api.patch).toHaveBeenCalledWith('/applications/application-1', { status: 'INTERVIEW' })
    expect(api.delete).toHaveBeenCalledWith('/applications/application-1')
  })

  it('uploads a replacement directly to S3 before updating the application', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        mode: 's3',
        storageKey: 'resumes/user-1/upload.pdf',
        url: 'https://jatbucket2799.s3.amazonaws.com',
        fields: { key: 'resumes/user-1/upload.pdf', policy: 'signed-policy' },
        expiresAt: '2026-08-10T03:00:00.000Z',
      },
    })
    vi.mocked(axios.post).mockResolvedValue({ status: 204 })
    vi.mocked(api.patch).mockResolvedValue({ data: application })
    const input = { company: 'Acme Labs', jobTitle: 'Senior Engineer' }
    const resume = new File(['replacement'], 'replacement.pdf', {
      type: 'application/pdf',
    })

    await applicationService.update(application.id, input, resume)

    expect(api.post).toHaveBeenCalledWith('/applications/resume-uploads', {
      fileName: 'replacement.pdf',
      mimeType: 'application/pdf',
      size: resume.size,
    })
    const uploadBody = vi.mocked(axios.post).mock.calls[0][1]
    expect(uploadBody).toBeInstanceOf(FormData)
    expect((uploadBody as FormData).get('key')).toBe('resumes/user-1/upload.pdf')
    expect((uploadBody as FormData).get('file')).toBe(resume)
    expect(api.patch).toHaveBeenCalledWith('/applications/application-1', {
      company: 'Acme Labs',
      jobTitle: 'Senior Engineer',
      resumeUploadKey: 'resumes/user-1/upload.pdf',
    })
  })

  it('deletes an unfinished S3 upload when application save fails', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        mode: 's3',
        storageKey: 'resumes/user-1/upload.pdf',
        url: 'https://jatbucket2799.s3.amazonaws.com',
        fields: { key: 'resumes/user-1/upload.pdf' },
        expiresAt: '2026-08-10T03:00:00.000Z',
      },
    })
    vi.mocked(axios.post).mockResolvedValue({ status: 204 })
    vi.mocked(api.patch).mockRejectedValue(new Error('Save failed'))
    vi.mocked(api.delete).mockResolvedValue({})
    const resume = new File(['replacement'], 'replacement.pdf', {
      type: 'application/pdf',
    })

    await expect(
      applicationService.update(
        application.id,
        { company: 'Acme Labs' },
        resume,
      ),
    ).rejects.toThrow('Save failed')
    expect(api.delete).toHaveBeenCalledWith('/applications/resume-uploads', {
      data: { storageKey: 'resumes/user-1/upload.pdf' },
    })
  })

  it('lists and creates application timeline events', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [event] })
    vi.mocked(api.post).mockResolvedValue({ data: event })
    const input = {
      type: 'NOTE' as const,
      description: 'Followed up with the recruiter.',
      occurredAt: '2026-08-07T00:00:00.000Z',
    }

    await expect(applicationService.listEvents(application.id)).resolves.toEqual([event])
    await expect(applicationService.createEvent(application.id, input)).resolves.toEqual(event)

    expect(api.get).toHaveBeenCalledWith('/applications/application-1/events')
    expect(api.post).toHaveBeenCalledWith('/applications/application-1/events', input)
  })

  it('downloads an application resume as a blob', async () => {
    const resume = new Blob(['resume'], { type: 'application/pdf' })
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { mode: 'database', url: null } })
      .mockResolvedValueOnce({ data: resume })

    await expect(applicationService.downloadResume('application-1')).resolves.toBe(resume)
    expect(api.get).toHaveBeenNthCalledWith(
      1,
      '/applications/application-1/resume-download',
    )
    expect(api.get).toHaveBeenCalledWith('/applications/application-1/resume', {
      responseType: 'blob',
    })
  })

  it('downloads an S3 resume without sending application cookies', async () => {
    const resume = new Blob(['resume'], { type: 'application/pdf' })
    vi.mocked(api.get).mockResolvedValue({
      data: { mode: 's3', url: 'https://jatbucket2799.s3.amazonaws.com/signed' },
    })
    vi.mocked(axios.get).mockResolvedValue({ data: resume })

    await expect(applicationService.downloadResume('application-1')).resolves.toBe(resume)
    expect(axios.get).toHaveBeenCalledWith(
      'https://jatbucket2799.s3.amazonaws.com/signed',
      { responseType: 'blob', withCredentials: false },
    )
  })
})
