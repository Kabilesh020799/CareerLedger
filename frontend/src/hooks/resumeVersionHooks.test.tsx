import type { PropsWithChildren } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resumeVersionService } from '../services/resume-version.service'
import { useCreateResumeVersion } from './useCreateResumeVersion'
import { useDeleteResumeVersion } from './useDeleteResumeVersion'
import { useResumeVersions } from './useResumeVersions'
import { useUpdateResumeVersion } from './useUpdateResumeVersion'

vi.mock('../services/resume-version.service', () => ({
  resumeVersionService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { invalidate, wrapper }
}

describe('resume version hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads resume versions', async () => {
    vi.mocked(resumeVersionService.list).mockResolvedValue([])
    const { wrapper } = setup()
    const { result } = renderHook(useResumeVersions, { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(resumeVersionService.list).toHaveBeenCalledOnce()
  })

  it('creates and refreshes resume versions', async () => {
    vi.mocked(resumeVersionService.create).mockResolvedValue({ id: 'resume-1' } as never)
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(useCreateResumeVersion, { wrapper })

    await act(() => result.current.mutateAsync({ name: 'Full-stack resume' }))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['resume-versions'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
  })

  it('updates and deletes while refreshing application associations', async () => {
    vi.mocked(resumeVersionService.update).mockResolvedValue({ id: 'resume-1' } as never)
    vi.mocked(resumeVersionService.remove).mockResolvedValue()
    const updateSetup = setup()
    const update = renderHook(useUpdateResumeVersion, { wrapper: updateSetup.wrapper })

    await act(() => update.result.current.mutateAsync({
      id: 'resume-1',
      input: { name: 'Backend resume' },
    }))
    expect(updateSetup.invalidate).toHaveBeenCalledWith({ queryKey: ['resume-versions'] })
    expect(updateSetup.invalidate).toHaveBeenCalledWith({ queryKey: ['applications'] })
    expect(updateSetup.invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] })

    const deleteSetup = setup()
    const remove = renderHook(useDeleteResumeVersion, { wrapper: deleteSetup.wrapper })
    await act(() => remove.result.current.mutateAsync('resume-1'))
    expect(deleteSetup.invalidate).toHaveBeenCalledWith({ queryKey: ['applications'] })
    expect(deleteSetup.invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
  })
})
