import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AppProvider } from './components/ui/AppProvider'
import { useGmailUpdateReviews } from './hooks/useGmailUpdateReviews'
import { WorkspaceProvider } from './contexts/WorkspaceContext'

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
    data: { sprint: null, applications: [] },
  }),
}))

vi.mock('./hooks/useArchivedSprints', () => ({
  useArchivedSprints: () => ({ isPending: false, isError: false, isSuccess: true, data: [] }),
}))

vi.mock('./hooks/useScheduledSprints', () => ({
  useScheduledSprints: () => ({ isPending: false, isError: false, isSuccess: true, data: [] }),
  useSprintTimelineNow: () => Date.now(),
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
      resumeOutcomes: [],
      sourceOutcomes: [],
    },
  }),
}))
vi.mock('./hooks/useGmailStatus', () => ({
  useGmailStatus: () => ({
    isPending: false,
    isError: false,
    isSuccess: true,
    data: {
      configured: false,
      connected: false,
      gmailEmail: null,
      lastSyncedAt: null,
      synchronizedMessages: 0,
    },
  }),
}))
vi.mock('./hooks/useGmailUpdateReviews', () => ({ useGmailUpdateReviews: vi.fn() }))
vi.mock('./services/workspace.service', () => ({
  workspaceService: { list: async () => [{ role: 'OWNER', workspace: { id: 'workspace-1', name: 'Personal workspace', isPersonal: true, _count: { applications: 0, members: 1 } } }] },
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
          <WorkspaceProvider><App /></WorkspaceProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </AppProvider>,
  )
}

describe('application routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useGmailUpdateReviews).mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    } as never)
  })
  afterEach(cleanup)

  it('shows primary navigation and navigates to applications', async () => {
    const user = userEvent.setup()
    renderApp('/dashboard')

    const menuButton = await screen.findByRole('button', { name: 'Open more navigation' })
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    await user.click(menuButton)
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tools' }))
    expect(screen.getByRole('link', { name: 'Email sync' })).toHaveAttribute('href', '/gmail')
    await user.click(screen.getByRole('link', { name: 'Applications' }))
    expect(await screen.findByRole('heading', { name: 'Applications' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open more navigation' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('navigates to the application board', async () => {
    const user = userEvent.setup()
    renderApp('/applications')

    await user.click(await screen.findByRole('button', { name: 'Open more navigation' }))
    await user.click(screen.getByRole('link', { name: 'Board' }))

    expect(await screen.findByRole('heading', { name: 'Application board' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No active sprint' })).toBeInTheDocument()
  })

  it('makes the archive available from primary navigation', async () => {
    const user = userEvent.setup()
    renderApp('/dashboard')

    await user.click(await screen.findByRole('button', { name: 'Open more navigation' }))
    await user.click(screen.getByRole('link', { name: 'Archive' }))

    expect(await screen.findByRole('heading', { name: 'Archive' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Archived applications' })).toBeInTheDocument()
  })

  it('shows all matched and new-application Gmail reviews in the navigation badge', async () => {
    const user = userEvent.setup()
    vi.mocked(useGmailUpdateReviews).mockReturnValue({
      data: [
        { id: 'matched-review', application: { id: 'application-1' } },
        { id: 'new-application-review', application: null },
      ],
      isPending: false,
      isError: false,
    } as never)
    renderApp('/dashboard')

    await user.click(await screen.findByRole('button', { name: 'Open more navigation' }))
    await user.click(screen.getByRole('button', { name: 'Tools' }))

    expect(screen.getByLabelText('2 pending email updates')).toHaveTextContent('2')
    expect(screen.getByRole('link', { name: /Email sync/ })).toHaveAttribute('href', '/gmail')
  })

  it('shows a recovery link for an unknown route', async () => {
    renderApp('/unknown')

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to applications' })).toHaveAttribute('href', '/applications')
  })
})
