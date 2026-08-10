import type { PropsWithChildren } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applicationService } from '../services/application.service'
import { useCreateApplication } from './useCreateApplication'
import { useCreateApplicationEvent } from './useCreateApplicationEvent'
import { useDeleteApplication } from './useDeleteApplication'
import { useDownloadApplicationResume } from './useDownloadApplicationResume'
import { useUpdateApplication } from './useUpdateApplication'

vi.mock('../services/application.service', () => ({
  applicationService: {
    create: vi.fn(),
    createEvent: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    downloadResume: vi.fn(),
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

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const remove = vi.spyOn(queryClient, 'removeQueries')
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, invalidate, remove, wrapper }
}

describe('application mutation hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('refreshes the application list after creation', async () => {
    vi.mocked(applicationService.create).mockResolvedValue(application)
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(useCreateApplication, { wrapper })

    await act(() => result.current.mutateAsync({
      input: { company: 'Acme Corp', jobTitle: 'Software Engineer' },
    }))

    expect(applicationService.create).toHaveBeenCalledWith(
      { company: 'Acme Corp', jobTitle: 'Software Engineer' },
      undefined,
    )

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['applications'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
  })

  it('refreshes the list and detail cache after an update', async () => {
    vi.mocked(applicationService.update).mockResolvedValue({ ...application, status: 'INTERVIEW' })
    const { queryClient, wrapper, invalidate } = setup()
    const setData = vi.spyOn(queryClient, 'setQueryData')
    const { result } = renderHook(useUpdateApplication, { wrapper })

    await act(() => result.current.mutateAsync({ id: application.id, input: { status: 'INTERVIEW' } }))

    expect(setData).toHaveBeenCalledWith(['applications', application.id], expect.objectContaining({ status: 'INTERVIEW' }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['applications'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['applications', application.id, 'events'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reminders'] })
  })

  it('refreshes the timeline after adding a manual event', async () => {
    vi.mocked(applicationService.createEvent).mockResolvedValue({
      id: 'event-1',
      applicationId: application.id,
      type: 'NOTE',
      description: 'Followed up with the recruiter.',
      fromStatus: null,
      toStatus: null,
      occurredAt: '2026-08-07T00:00:00.000Z',
      createdAt: '2026-08-07T15:30:00.000Z',
    })
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(useCreateApplicationEvent, { wrapper })

    await act(() => result.current.mutateAsync({
      applicationId: application.id,
      input: {
        type: 'NOTE',
        description: 'Followed up with the recruiter.',
        occurredAt: '2026-08-07T00:00:00.000Z',
      },
    }))

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['applications', application.id, 'events'],
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reminders'] })
  })

  it('downloads a resume using its generated filename', async () => {
    const resume = new Blob(['resume'], { type: 'application/pdf' })
    vi.mocked(applicationService.downloadResume).mockResolvedValue(resume)
    const createObjectUrl = vi.fn(() => 'blob:resume')
    const revokeObjectUrl = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    vi.stubGlobal('URL', { ...URL, createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl })
    const { wrapper } = setup()
    const { result } = renderHook(useDownloadApplicationResume, { wrapper })

    await act(() => result.current.mutateAsync({
      applicationId: 'application-1',
      fileName: 'Software_Engineer_Acme_Corp.pdf',
    }))

    expect(applicationService.downloadResume).toHaveBeenCalledWith('application-1')
    expect(createObjectUrl).toHaveBeenCalledWith(resume)
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:resume')
    click.mockRestore()
    vi.unstubAllGlobals()
  })

  it('removes deleted details and refreshes the list', async () => {
    vi.mocked(applicationService.remove).mockResolvedValue()
    const { wrapper, invalidate, remove } = setup()
    const { result } = renderHook(useDeleteApplication, { wrapper })

    await act(() => result.current.mutateAsync(application.id))

    expect(remove).toHaveBeenCalledWith({ queryKey: ['applications', application.id] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['applications'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reminders'] })
  })
})
