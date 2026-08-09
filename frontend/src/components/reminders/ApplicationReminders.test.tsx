import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useApplicationReminders } from '../../hooks/useApplicationReminders'
import { useCreateReminder } from '../../hooks/useCreateReminder'
import { useDeleteReminder } from '../../hooks/useDeleteReminder'
import { useUpdateReminder } from '../../hooks/useUpdateReminder'
import type { Reminder } from '../../types/reminder'
import { AppProvider } from '../ui/AppProvider'
import { ApplicationReminders } from './ApplicationReminders'

vi.mock('../../hooks/useApplicationReminders', () => ({ useApplicationReminders: vi.fn() }))
vi.mock('../../hooks/useCreateReminder', () => ({ useCreateReminder: vi.fn() }))
vi.mock('../../hooks/useDeleteReminder', () => ({ useDeleteReminder: vi.fn() }))
vi.mock('../../hooks/useUpdateReminder', () => ({ useUpdateReminder: vi.fn() }))

const openReminder = {
  id: 'reminder-open',
  applicationId: 'application-1',
  type: 'FOLLOW_UP',
  description: 'Contact the recruiter',
  dueAt: '2099-08-15T13:30:00.000Z',
  completedAt: null,
  createdAt: '2026-08-09T00:00:00.000Z',
  updatedAt: '2026-08-09T00:00:00.000Z',
} satisfies Reminder

const completedReminder = {
  ...openReminder,
  id: 'reminder-completed',
  description: 'Submit assessment',
  type: 'DEADLINE',
  completedAt: '2026-08-09T15:00:00.000Z',
} satisfies Reminder

const createMutation = { mutateAsync: vi.fn(), isPending: false, error: null }
const updateMutation = { mutate: vi.fn(), isPending: false, variables: undefined, error: null }
const deleteMutation = { mutate: vi.fn(), isPending: false, variables: undefined, error: null }

function renderReminders() {
  return render(
    <AppProvider>
      <ApplicationReminders applicationId="application-1" />
    </AppProvider>,
  )
}

describe('ApplicationReminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCreateReminder).mockReturnValue(createMutation as never)
    vi.mocked(useUpdateReminder).mockReturnValue(updateMutation as never)
    vi.mocked(useDeleteReminder).mockReturnValue(deleteMutation as never)
  })
  afterEach(cleanup)

  it('shows an empty reminder state', () => {
    vi.mocked(useApplicationReminders).mockReturnValue({
      data: [], isPending: false, isError: false,
    } as never)

    renderReminders()

    expect(screen.getByText('No reminders yet')).toBeInTheDocument()
  })

  it('validates and creates a reminder', async () => {
    const user = userEvent.setup()
    createMutation.mutateAsync.mockResolvedValue({ id: 'reminder-1' })
    vi.mocked(useApplicationReminders).mockReturnValue({
      data: [], isPending: false, isError: false,
    } as never)
    renderReminders()

    await user.selectOptions(screen.getByLabelText(/Reminder type/), 'DEADLINE')
    await user.type(screen.getByLabelText(/Description/), 'Complete assessment')
    await user.type(screen.getByLabelText(/Due date and time/), '2099-08-15T09:30')
    await user.click(screen.getByRole('button', { name: 'Add reminder' }))

    expect(createMutation.mutateAsync).toHaveBeenCalledWith({
      applicationId: 'application-1',
      input: {
        type: 'DEADLINE',
        description: 'Complete assessment',
        dueAt: new Date('2099-08-15T09:30').toISOString(),
      },
    })
  })

  it('completes, reopens, and deletes reminders', async () => {
    const user = userEvent.setup()
    vi.mocked(useApplicationReminders).mockReturnValue({
      data: [openReminder, completedReminder],
      isPending: false,
      isError: false,
    } as never)
    renderReminders()

    await user.click(screen.getByRole('button', { name: 'Complete' }))
    await user.click(screen.getByRole('button', { name: 'Reopen' }))
    expect(updateMutation.mutate).toHaveBeenNthCalledWith(1, {
      id: 'reminder-open', completed: true,
    })
    expect(updateMutation.mutate).toHaveBeenNthCalledWith(2, {
      id: 'reminder-completed', completed: false,
    })

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])
    await user.click(screen.getByRole('button', { name: 'Delete reminder' }))
    expect(deleteMutation.mutate).toHaveBeenCalledWith('reminder-open')
  })

  it('shows a retry action when reminders fail to load', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()
    vi.mocked(useApplicationReminders).mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error('Reminders unavailable'),
      refetch,
    } as never)

    renderReminders()
    expect(screen.getByText('Reminders unavailable')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
