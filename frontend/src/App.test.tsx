import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AppProvider } from './components/ui/AppProvider'

vi.mock('./hooks/useApplications', () => ({
  useApplications: () => ({
    isPending: false,
    isError: false,
    isSuccess: true,
    data: { data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } },
  }),
}))

vi.mock('./hooks/useApplicationBoard', () => ({
  useApplicationBoard: () => ({
    isPending: false,
    isError: false,
    isSuccess: true,
    data: [],
  }),
}))

vi.mock('./hooks/useMoveApplication', () => ({
  useMoveApplication: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
  }),
}))

vi.mock('./hooks/useDashboardSummary', () => ({
  useDashboardSummary: () => ({
    isPending: false,
    isError: false,
    isSuccess: true,
    data: {
      totalApplications: 0,
      createdThisWeek: 0,
      weekStartedAt: '2026-08-03T00:00:00.000Z',
      submittedApplications: 0,
      statusCounts: {
        SAVED: 0,
        APPLIED: 0,
        SCREENING: 0,
        ASSESSMENT: 0,
        INTERVIEW: 0,
        OFFER: 0,
        REJECTED: 0,
        WITHDRAWN: 0,
      },
      conversionRates: { screening: 0, interview: 0, offer: 0 },
    },
  }),
}))

vi.mock('./components/reminders/DashboardReminders', () => ({
  DashboardReminders: () => <div>Reminder overview</div>,
}))
vi.mock('./components/reminders/FollowUpSuggestions', () => ({
  FollowUpSuggestions: () => <div>Follow-up suggestions</div>,
}))

vi.mock('./hooks/useSession', () => ({
  useSession: () => ({
    isPending: false,
    isError: false,
    data: {
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        avatarUrl: null,
      },
    },
  }),
}))

vi.mock('./hooks/useLogout', () => ({
  useLogout: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))

function renderApp(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <AppProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    </AppProvider>,
  )
}

describe('application routing', () => {
  afterEach(cleanup)

  it('shows primary navigation and navigates to applications', async () => {
    const user = userEvent.setup()
    renderApp('/dashboard')

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Applications' }))
    expect(screen.getByRole('heading', { name: 'Applications' })).toBeInTheDocument()
  })

  it('navigates to the application board', async () => {
    const user = userEvent.setup()
    renderApp('/applications')

    await user.click(screen.getByRole('link', { name: 'Board' }))

    expect(screen.getByRole('heading', { name: 'Application board' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No applications on your board' })).toBeInTheDocument()
  })

  it('shows a recovery link for an unknown route', () => {
    renderApp('/unknown')

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to applications' })).toHaveAttribute('href', '/applications')
  })
})
