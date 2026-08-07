import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { useApplications } from '../hooks/useApplications'
import { ApplicationsPage } from './ApplicationsPage'

vi.mock('../hooks/useApplications', () => ({ useApplications: vi.fn() }))

function renderPage() {
  return render(<AppProvider><MemoryRouter><ApplicationsPage /></MemoryRouter></AppProvider>)
}

describe('ApplicationsPage', () => {
  it('shows a loading state', () => {
    vi.mocked(useApplications).mockReturnValue({ isPending: true } as never)
    renderPage()
    expect(screen.getByLabelText('Loading applications')).toBeInTheDocument()
  })

  it('shows an empty state with a creation link', () => {
    vi.mocked(useApplications).mockReturnValue({ isPending: false, isError: false, isSuccess: true, data: [] } as never)
    renderPage()
    expect(screen.getByRole('heading', { name: 'No applications yet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create your first application' })).toHaveAttribute('href', '/applications/new')
  })

  it('shows an error state and retries the query', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()
    vi.mocked(useApplications).mockReturnValue({
      isPending: false,
      isError: true,
      isSuccess: false,
      error: new Error('Network unavailable'),
      refetch,
    } as never)

    renderPage()
    expect(screen.getByText('Network unavailable')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('renders application data in the table', () => {
    vi.mocked(useApplications).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [{
        id: 'application-1',
        company: 'Acme Corp',
        jobTitle: 'Software Engineer',
        location: 'Remote',
        jobUrl: null,
        source: 'LinkedIn',
        status: 'APPLIED',
        notes: null,
        appliedAt: '2026-08-06T12:00:00.000Z',
        createdAt: '2026-08-06T12:00:00.000Z',
        updatedAt: '2026-08-06T12:00:00.000Z',
      }],
    } as never)

    renderPage()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Software Engineer')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/applications/application-1')
  })
})
