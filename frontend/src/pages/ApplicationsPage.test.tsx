import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { useApplications } from '../hooks/useApplications'
import { ApplicationsPage } from './ApplicationsPage'

vi.mock('../hooks/useApplications', () => ({ useApplications: vi.fn() }))

const application = {
  id: 'application-1',
  company: 'Acme Corp',
  jobTitle: 'Software Engineer',
  location: 'Remote',
  jobUrl: null,
  source: 'LinkedIn',
  status: 'APPLIED' as const,
  notes: null,
  appliedAt: '2026-08-06T12:00:00.000Z',
  createdAt: '2026-08-06T12:00:00.000Z',
  updatedAt: '2026-08-06T12:00:00.000Z',
}

function successResult(data = [application], total = data.length, pages = total > 0 ? 1 : 0) {
  return {
    isPending: false,
    isError: false,
    isSuccess: true,
    data: {
      data,
      pagination: { page: 1, limit: 20, total, pages },
    },
  }
}

function renderPage(path = '/applications') {
  return render(
    <AppProvider>
      <MemoryRouter initialEntries={[path]}>
        <ApplicationsPage />
      </MemoryRouter>
    </AppProvider>,
  )
}

describe('ApplicationsPage', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('shows a loading state', () => {
    vi.mocked(useApplications).mockReturnValue({ isPending: true } as never)
    renderPage()
    expect(screen.getByLabelText('Loading applications')).toBeInTheDocument()
  })

  it('shows an empty state with a creation link', () => {
    vi.mocked(useApplications).mockReturnValue(successResult([], 0, 0) as never)
    renderPage()
    expect(screen.getByRole('heading', { name: 'No applications yet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create your first application' })).toHaveAttribute('href', '/applications/new')
  })

  it('shows a filtered no-results state and clears the controls', async () => {
    const user = userEvent.setup()
    vi.mocked(useApplications).mockReturnValue(successResult([], 0, 0) as never)
    renderPage('/applications?search=missing&status=INTERVIEW')

    expect(screen.getByRole('heading', { name: 'No matching applications' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Filters/ })).toHaveTextContent('On')
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    await waitFor(() => {
      expect(useApplications).toHaveBeenLastCalledWith({
        sortBy: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      })
    })
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

  it('renders application data and pagination in the table', () => {
    vi.mocked(useApplications).mockReturnValue(successResult() as never)

    renderPage()
    expect(screen.getAllByText('Acme Corp')).toHaveLength(2)
    expect(screen.getAllByText('Software Engineer')).toHaveLength(2)
    expect(screen.getByText('Showing 1 of 1 applications')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Acme Corp application' })).toHaveAttribute('href', '/applications/application-1')
  })

  it('applies discovery controls and resets the page in the URL query', async () => {
    const user = userEvent.setup()
    vi.mocked(useApplications).mockReturnValue(successResult() as never)
    renderPage('/applications?page=2')

    await user.click(screen.getByRole('button', { name: 'Filters' }))
    await user.type(screen.getByLabelText('Search'), 'Acme')
    await user.selectOptions(screen.getByLabelText('Status'), 'APPLIED')
    await user.selectOptions(screen.getByLabelText('Sort by'), 'company')
    await user.selectOptions(screen.getByLabelText('Order'), 'asc')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))

    await waitFor(() => {
      expect(useApplications).toHaveBeenLastCalledWith({
        search: 'Acme',
        status: 'APPLIED',
        sortBy: 'company',
        sortOrder: 'asc',
        page: 1,
        limit: 20,
      })
    })
  })

  it('moves between pages through the URL query', async () => {
    const user = userEvent.setup()
    vi.mocked(useApplications).mockReturnValue(successResult([application], 25, 2) as never)
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(useApplications).toHaveBeenLastCalledWith({
        sortBy: 'createdAt',
        sortOrder: 'desc',
        page: 2,
        limit: 20,
      })
    })
  })
})
