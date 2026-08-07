import type { PropsWithChildren } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applicationService } from '../services/application.service'
import { useCreateApplication } from './useCreateApplication'
import { useDeleteApplication } from './useDeleteApplication'
import { useUpdateApplication } from './useUpdateApplication'

vi.mock('../services/application.service', () => ({
  applicationService: {
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
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

    await act(() => result.current.mutateAsync({ company: 'Acme Corp', jobTitle: 'Software Engineer' }))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['applications'] })
  })

  it('refreshes the list and detail cache after an update', async () => {
    vi.mocked(applicationService.update).mockResolvedValue({ ...application, status: 'INTERVIEW' })
    const { queryClient, wrapper, invalidate } = setup()
    const setData = vi.spyOn(queryClient, 'setQueryData')
    const { result } = renderHook(useUpdateApplication, { wrapper })

    await act(() => result.current.mutateAsync({ id: application.id, input: { status: 'INTERVIEW' } }))

    expect(setData).toHaveBeenCalledWith(['applications', application.id], expect.objectContaining({ status: 'INTERVIEW' }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['applications'] })
  })

  it('removes deleted details and refreshes the list', async () => {
    vi.mocked(applicationService.remove).mockResolvedValue()
    const { wrapper, invalidate, remove } = setup()
    const { result } = renderHook(useDeleteApplication, { wrapper })

    await act(() => result.current.mutateAsync(application.id))

    expect(remove).toHaveBeenCalledWith({ queryKey: ['applications', application.id] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['applications'] })
  })
})
