import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import { applicationService } from './application.service'

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

  it('lists applications from the API', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [application] })

    await expect(applicationService.list()).resolves.toEqual([application])
    expect(api.get).toHaveBeenCalledWith('/applications')
  })

  it('creates an application through the API', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: application })
    const input = { company: 'Acme Corp', jobTitle: 'Software Engineer' }

    await expect(applicationService.create(input)).resolves.toEqual(application)
    expect(api.post).toHaveBeenCalledWith('/applications', input)
  })

  it('updates and deletes an application through the API', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { ...application, status: 'INTERVIEW' } })
    vi.mocked(api.delete).mockResolvedValue({})

    await applicationService.update(application.id, { status: 'INTERVIEW' })
    await applicationService.remove(application.id)

    expect(api.patch).toHaveBeenCalledWith('/applications/application-1', { status: 'INTERVIEW' })
    expect(api.delete).toHaveBeenCalledWith('/applications/application-1')
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
})
