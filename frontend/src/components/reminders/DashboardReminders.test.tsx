import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOpenReminders } from '../../hooks/useOpenReminders'
import { useUpdateReminder } from '../../hooks/useUpdateReminder'
import type { ReminderWithApplication } from '../../types/reminder'
import { AppProvider } from '../ui/AppProvider'
import { DashboardReminders } from './DashboardReminders'

vi.mock('../../hooks/useOpenReminders', () => ({ useOpenReminders: vi.fn() }))
vi.mock('../../hooks/useUpdateReminder', () => ({ useUpdateReminder: vi.fn() }))

function reminder(id: string, dueAt: string): ReminderWithApplication {
  return {
    id,
    applicationId: 'application-1',
    type: id === 'overdue' ? 'FOLLOW_UP' : 'DEADLINE',
    description: id === 'overdue' ? 'Contact recruiter' : 'Submit assessment',
    dueAt,
    completedAt: null,
    createdAt: '2026-08-09T00:00:00.000Z',
    updatedAt: '2026-08-09T00:00:00.000Z',
    application: {
      id: 'application-1',
      company: 'Acme Corp',
      jobTitle: 'Engineer',
    },
  }
}

const updateMutation = { mutate: vi.fn(), isPending: false, variables: undefined, isError: false }

function renderReminders() {
  return render(
    <AppProvider>
      <MemoryRouter>
        <DashboardReminders />
      </MemoryRouter>
    </AppProvider>,
  )
}

describe('DashboardReminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useUpdateReminder).mockReturnValue(updateMutation as never)
  })
  afterEach(cleanup)

  it('separates overdue and upcoming reminders and links applications', async () => {
    const user = userEvent.setup()
    vi.mocked(useOpenReminders).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [
        reminder('overdue', '2020-08-08T12:00:00.000Z'),
        reminder('upcoming', '2099-08-10T12:00:00.000Z'),
      ],
    } as never)

    renderReminders()

    expect(screen.getByRole('heading', { name: 'Overdue (1)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Upcoming (1)' })).toBeInTheDocument()
    const overdueCard = screen.getByRole('article', { name: 'Contact recruiter' })
    expect(within(overdueCard).getByRole('link', { name: /Acme Corp/ }))
      .toHaveAttribute('href', '/applications/application-1')
    await user.click(within(overdueCard).getByRole('button', { name: 'Complete' }))
    expect(updateMutation.mutate).toHaveBeenCalledWith({
      id: 'overdue', completed: true,
    })
  })

  it('shows an empty open-reminder state', () => {
    vi.mocked(useOpenReminders).mockReturnValue({
      isPending: false, isError: false, isSuccess: true, data: [],
    } as never)

    renderReminders()
    expect(screen.getByText('No open reminders')).toBeInTheDocument()
  })

  it('shows a retryable loading failure', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()
    vi.mocked(useOpenReminders).mockReturnValue({
      isPending: false,
      isError: true,
      isSuccess: false,
      error: new Error('Open reminders unavailable'),
      refetch,
    } as never)

    renderReminders()
    expect(screen.getByText('Open reminders unavailable')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
