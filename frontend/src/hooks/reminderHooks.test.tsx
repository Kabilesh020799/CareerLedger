import type { PropsWithChildren } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reminderService } from '../services/reminder.service'
import { useApplicationReminders } from './useApplicationReminders'
import { useCreateReminder } from './useCreateReminder'
import { useCreateSuggestedFollowUp } from './useCreateSuggestedFollowUp'
import { useDeleteReminder } from './useDeleteReminder'
import { useOpenReminders } from './useOpenReminders'
import { useFollowUpSuggestions } from './useFollowUpSuggestions'
import { useUpdateReminder } from './useUpdateReminder'

vi.mock('../services/reminder.service', () => ({
  reminderService: {
    listForApplication: vi.fn(),
    listOpen: vi.fn(),
    listFollowUpSuggestions: vi.fn(),
    createSuggestedFollowUp: vi.fn(),
    create: vi.fn(),
    setCompleted: vi.fn(),
    remove: vi.fn(),
  },
}))

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { invalidate, wrapper }
}

describe('reminder hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads application reminders, open reminders, and suggestions', async () => {
    vi.mocked(reminderService.listForApplication).mockResolvedValue([])
    vi.mocked(reminderService.listOpen).mockResolvedValue([])
    vi.mocked(reminderService.listFollowUpSuggestions).mockResolvedValue([])
    const { wrapper } = setup()
    const applicationResult = renderHook(
      () => useApplicationReminders('application-1'),
      { wrapper },
    )
    const openResult = renderHook(useOpenReminders, { wrapper })
    const suggestionsResult = renderHook(useFollowUpSuggestions, { wrapper })

    await waitFor(() => expect(applicationResult.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(openResult.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(suggestionsResult.result.current.isSuccess).toBe(true))

    expect(reminderService.listForApplication).toHaveBeenCalledWith('application-1')
    expect(reminderService.listOpen).toHaveBeenCalledOnce()
    expect(reminderService.listFollowUpSuggestions).toHaveBeenCalledOnce()
  })

  it('creates a reminder and refreshes reminder queries', async () => {
    vi.mocked(reminderService.create).mockResolvedValue({ id: 'reminder-1' } as never)
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(useCreateReminder, { wrapper })
    const input = {
      type: 'FOLLOW_UP' as const,
      description: 'Contact recruiter',
      dueAt: '2099-08-15T13:30:00.000Z',
    }

    await act(() => result.current.mutateAsync({ applicationId: 'application-1', input }))

    expect(reminderService.create).toHaveBeenCalledWith('application-1', input)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reminders'] })
  })

  it('creates a suggested follow-up and refreshes reminder queries', async () => {
    vi.mocked(reminderService.createSuggestedFollowUp).mockResolvedValue({ id: 'reminder-1' } as never)
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(useCreateSuggestedFollowUp, { wrapper })

    await act(() => result.current.mutateAsync('application-1'))

    expect(reminderService.createSuggestedFollowUp).toHaveBeenCalledWith('application-1')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reminders'] })
  })

  it('updates reminder completion and refreshes reminder queries', async () => {
    vi.mocked(reminderService.setCompleted).mockResolvedValue({ id: 'reminder-1' } as never)
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(useUpdateReminder, { wrapper })

    await act(() => result.current.mutateAsync({ id: 'reminder-1', completed: true }))

    expect(reminderService.setCompleted).toHaveBeenCalledWith('reminder-1', true)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reminders'] })
  })

  it('deletes a reminder and refreshes reminder queries', async () => {
    vi.mocked(reminderService.remove).mockResolvedValue()
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(useDeleteReminder, { wrapper })

    await act(() => result.current.mutateAsync('reminder-1'))

    expect(reminderService.remove).toHaveBeenCalledWith('reminder-1')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reminders'] })
  })
})
