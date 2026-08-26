import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { useArchivedSprints } from '../hooks/useArchivedSprints'
import { ArchivedApplicationsPage } from './ArchivedApplicationsPage'

vi.mock('../hooks/useArchivedSprints', () => ({ useArchivedSprints: vi.fn() }))

const archivedSprint = {
  id: 'sprint-0',
  userId: 'user-1',
  workspaceId: null,
  name: 'Sprint 0',
  sequence: 0,
  status: 'CLOSED' as const,
  scheduledStartAt: null,
  durationDays: 14,
  startedAt: '2026-07-24T12:00:00.000Z',
  endsAt: '2026-08-07T12:00:00.000Z',
  closedAt: '2026-08-07T12:00:00.000Z',
  createdAt: '2026-07-24T12:00:00.000Z',
  updatedAt: '2026-08-07T12:00:00.000Z',
}

describe('ArchivedApplicationsPage', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('makes archived applications available from a dedicated page', () => {
    vi.mocked(useArchivedSprints).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [{
        sprint: archivedSprint,
        applications: [{
          id: 'application-archived',
          company: 'Acme Corp',
          jobTitle: 'Software Engineer',
          location: null,
          jobUrl: null,
          source: null,
          status: 'REJECTED',
          notes: null,
          appliedAt: null,
          createdAt: '2026-08-01T12:00:00.000Z',
          updatedAt: '2026-08-07T12:00:00.000Z',
        }],
      }],
    } as never)

    render(<AppProvider><MemoryRouter><ArchivedApplicationsPage /></MemoryRouter></AppProvider>)

    expect(screen.getByRole('heading', { name: 'Archive' })).toBeInTheDocument()
    const archive = screen.getByRole('region', { name: 'Archived applications' })
    expect(within(archive).getByRole('heading', { name: 'Sprint 0' })).toBeInTheDocument()
    expect(within(archive).getByRole('link', { name: /Acme Corp.*Software Engineer/ })).toHaveAttribute('href', '/applications/application-archived')
    expect(within(archive).getByText('Rejected')).toBeInTheDocument()
  })

  it('shows loading, empty, and recoverable error states', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()
    vi.mocked(useArchivedSprints).mockReturnValue({ isPending: true } as never)
    const { unmount } = render(<AppProvider><MemoryRouter><ArchivedApplicationsPage /></MemoryRouter></AppProvider>)
    expect(screen.getByLabelText('Loading archived applications')).toBeInTheDocument()

    unmount()
    vi.mocked(useArchivedSprints).mockReturnValue({ isPending: false, isError: true, error: new Error('Archive failed'), refetch } as never)
    render(<AppProvider><MemoryRouter><ArchivedApplicationsPage /></MemoryRouter></AppProvider>)
    expect(screen.getByText('Archive failed')).toBeInTheDocument()
    await user.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()

    unmount()
    vi.mocked(useArchivedSprints).mockReturnValue({ isPending: false, isError: false, isSuccess: true, data: [] } as never)
    render(<AppProvider><MemoryRouter><ArchivedApplicationsPage /></MemoryRouter></AppProvider>)
    expect(screen.getByText('No archived applications yet.')).toBeInTheDocument()
  })
})
