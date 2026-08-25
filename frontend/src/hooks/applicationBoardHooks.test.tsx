import type { PropsWithChildren } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applicationService } from '../services/application.service'
import type { Application } from '../types/application'
import { applicationQueryKeys } from './applicationQueryKeys'
import { useApplicationBoard } from './useApplicationBoard'
import { useMoveApplication } from './useMoveApplication'

vi.mock('../services/application.service', () => ({
  applicationService: {
    getCurrentSprint: vi.fn(),
    update: vi.fn(),
  },
}))

const application = {
  id: 'application-1',
  company: 'Acme Corp',
  jobTitle: 'Software Engineer',
  location: null,
  jobUrl: null,
  source: null,
  status: 'APPLIED',
  notes: null,
  appliedAt: null,
  createdAt: '2026-08-08T12:00:00.000Z',
  updatedAt: '2026-08-08T12:00:00.000Z',
} satisfies Application

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return { queryClient, wrapper }
}

describe('application board hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the active sprint and its applications for the board', async () => {
    vi.mocked(applicationService.getCurrentSprint).mockResolvedValue({
      sprint: {
        id: 'sprint-1',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        name: 'Sprint 1',
        sequence: 1,
        status: 'ACTIVE',
        durationDays: 14,
        startedAt: '2026-08-08T12:00:00.000Z',
        endsAt: '2026-08-22T12:00:00.000Z',
        closedAt: null,
        createdAt: '2026-08-08T12:00:00.000Z',
        updatedAt: '2026-08-08T12:00:00.000Z',
      },
      applications: [application],
    })
    const { wrapper } = setup()
    const { result } = renderHook(useApplicationBoard, { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.applications).toEqual([application])
    expect(applicationService.getCurrentSprint).toHaveBeenCalledOnce()
  })

  it('moves a card optimistically and refreshes application caches', async () => {
    vi.mocked(applicationService.update).mockResolvedValue({
      ...application,
      status: 'INTERVIEW',
    })
    const { queryClient, wrapper } = setup()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    queryClient.setQueryData(applicationQueryKeys.board, { sprint: null, applications: [application] })
    const { result } = renderHook(useMoveApplication, { wrapper })

    await act(() => result.current.mutateAsync({
      id: application.id,
      status: 'INTERVIEW',
    }))

    expect(applicationService.update).toHaveBeenCalledWith(application.id, {
      status: 'INTERVIEW',
    })
    expect(queryClient.getQueryData<{ applications: Application[] }>(applicationQueryKeys.board)?.applications[0].status)
      .toBe('INTERVIEW')
    expect(queryClient.getQueryData(applicationQueryKeys.detail(application.id)))
      .toEqual(expect.objectContaining({ status: 'INTERVIEW' }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: applicationQueryKeys.all })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: applicationQueryKeys.events(application.id),
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
  })

  it('restores the previous board when a move fails', async () => {
    let rejectUpdate: (error: Error) => void = () => undefined
    vi.mocked(applicationService.update).mockReturnValue(new Promise((_resolve, reject) => {
      rejectUpdate = reject
    }))
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(applicationQueryKeys.board, { sprint: null, applications: [application] })
    const { result } = renderHook(useMoveApplication, { wrapper })

    act(() => result.current.mutate({ id: application.id, status: 'INTERVIEW' }))

    await waitFor(() => {
      expect(queryClient.getQueryData<{ applications: Application[] }>(applicationQueryKeys.board)?.applications[0].status)
        .toBe('INTERVIEW')
    })

    act(() => rejectUpdate(new Error('Update failed')))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(queryClient.getQueryData<{ applications: Application[] }>(applicationQueryKeys.board)?.applications[0].status)
      .toBe('APPLIED')
  })
})
