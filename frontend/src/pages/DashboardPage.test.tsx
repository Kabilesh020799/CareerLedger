import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { useDashboardSummary } from '../hooks/useDashboardSummary'
import type { DashboardSummary } from '../types/dashboard'
import { DashboardPage } from './DashboardPage'

vi.mock('../hooks/useDashboardSummary', () => ({ useDashboardSummary: vi.fn() }))
vi.mock('../components/reminders/DashboardReminders', () => ({
  DashboardReminders: () => <div>Reminder overview</div>,
}))
vi.mock('../components/reminders/FollowUpSuggestions', () => ({
  FollowUpSuggestions: () => <div>Follow-up suggestions</div>,
}))

const summary = {
  totalApplications: 9,
  createdThisWeek: 3,
  weekStartedAt: '2026-08-03T00:00:00.000Z',
  submittedApplications: 7,
  statusCounts: {
    SAVED: 2,
    APPLIED: 2,
    SCREENING: 1,
    ASSESSMENT: 1,
    INTERVIEW: 1,
    OFFER: 1,
    REJECTED: 1,
    WITHDRAWN: 0,
  },
  conversionRates: { screening: 57.1, interview: 28.6, offer: 14.3 },
} satisfies DashboardSummary

function renderPage() {
  return render(
    <AppProvider>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </AppProvider>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('shows status totals, weekly activity, and conversion rates', () => {
    vi.mocked(useDashboardSummary).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: summary,
    } as never)

    renderPage()

    expect(within(screen.getByRole('article', { name: 'Total applications' })).getByText('9')).toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Created since Monday' })).getByText('3')).toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Offers' })).getByText('1')).toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Screening progression' })).getByText('57.1%')).toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Interview progression' })).getByText('28.6%')).toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Offer progression' })).getByText('14.3%')).toBeInTheDocument()
    expect(screen.getByText(/7 submitted applications/)).toBeInTheDocument()
  })

  it('shows zero metrics and a creation action for an empty dashboard', () => {
    vi.mocked(useDashboardSummary).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: {
        ...summary,
        totalApplications: 0,
        createdThisWeek: 0,
        submittedApplications: 0,
        statusCounts: Object.fromEntries(
          Object.keys(summary.statusCounts).map((status) => [status, 0]),
        ),
        conversionRates: { screening: 0, interview: 0, offer: 0 },
      },
    } as never)

    renderPage()

    expect(screen.getByRole('heading', { name: 'No application activity yet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create your first application' })).toHaveAttribute('href', '/applications/new')
    expect(screen.getAllByText('0%')).toHaveLength(3)
  })

  it('shows loading and retryable error states', async () => {
    const user = userEvent.setup()
    vi.mocked(useDashboardSummary).mockReturnValue({ isPending: true } as never)
    const { unmount } = renderPage()
    expect(screen.getByLabelText('Loading dashboard')).toBeInTheDocument()

    unmount()
    const refetch = vi.fn()
    vi.mocked(useDashboardSummary).mockReturnValue({
      isPending: false,
      isError: true,
      isSuccess: false,
      error: new Error('Metrics unavailable'),
      refetch,
    } as never)
    renderPage()
    expect(screen.getByText('Metrics unavailable')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
