import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { useDashboardSummary } from '../hooks/useDashboardSummary'
import { useScheduledSprints } from '../hooks/useScheduledSprints'
import type { DashboardSummary } from '../types/dashboard'
import { DashboardPage } from './DashboardPage'

vi.mock('../hooks/useDashboardSummary', () => ({ useDashboardSummary: vi.fn() }))
vi.mock('../hooks/useScheduledSprints', () => ({ useScheduledSprints: vi.fn() }))
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
  resumeOutcomes: [
    {
      resumeVersionId: 'resume-1',
      name: 'Full-stack resume',
      submittedApplications: 7,
      milestoneCounts: { screening: 4, interview: 2, offer: 1 },
      conversionRates: { screening: 57.1, interview: 28.6, offer: 14.3 },
    },
  ],
  sourceOutcomes: [
    {
      source: 'LinkedIn',
      submittedApplications: 7,
      outcomeCounts: { response: 5, interview: 2, offer: 1 },
      outcomeRates: { response: 71.4, interview: 28.6, offer: 14.3 },
    },
  ],
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
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useScheduledSprints).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [],
    } as never)
  })
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
    expect(screen.getByRole('row', { name: 'Outcomes for LinkedIn' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add application' })).toHaveAttribute('href', '/applications/new')
  })

  it('keeps analytics compact behind source and resume tabs', async () => {
    const user = userEvent.setup()
    vi.mocked(useDashboardSummary).mockReturnValue({ isPending: false, isError: false, isSuccess: true, data: summary } as never)
    renderPage()

    expect(screen.getByRole('tab', { name: 'By source' })).toHaveAttribute('data-selected')
    await user.click(screen.getByRole('tab', { name: 'By resume tag' }))
    expect(screen.getByRole('row', { name: 'Outcomes for Full-stack resume' })).toBeInTheDocument()
  })

  it('shows upcoming sprint dates with a shortcut back to the timeline', () => {
    vi.mocked(useDashboardSummary).mockReturnValue({ isPending: false, isError: false, isSuccess: true, data: summary } as never)
    vi.mocked(useScheduledSprints).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [{
        id: 'sprint-upcoming',
        userId: 'user-1',
        workspaceId: null,
        name: 'Interview push',
        sequence: 2,
        status: 'SCHEDULED',
        scheduledStartAt: '2026-09-10T00:00:00.000Z',
        durationDays: 14,
        startedAt: '2026-09-10T00:00:00.000Z',
        endsAt: '2026-09-24T00:00:00.000Z',
        closedAt: null,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      }],
    } as never)

    renderPage()

    const schedule = screen.getByRole('region', { name: 'Upcoming sprint schedule' })
    expect(within(schedule).getByRole('article', { name: 'Interview push, upcoming sprint summary' })).toBeInTheDocument()
    expect(within(schedule).getByText(/Starts/)).toBeInTheDocument()
    expect(within(schedule).getByText(/Ends/)).toBeInTheDocument()
    expect(within(schedule).getByRole('link', { name: 'Manage on Board' })).toHaveAttribute('href', '/board#upcoming-sprints-heading')
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
        resumeOutcomes: [],
        sourceOutcomes: [],
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
