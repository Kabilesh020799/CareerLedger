import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { useCalendarEvents, useCalendarSubscription, useCreateCalendarSubscription, useDownloadCalendar, useRevokeCalendarSubscription } from '../hooks/useCalendar'
import { CalendarPage } from './CalendarPage'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../hooks/useCalendar', () => ({
  useCalendarSubscription: vi.fn(),
  useCalendarEvents: vi.fn(),
  useCreateCalendarSubscription: vi.fn(),
  useDownloadCalendar: vi.fn(),
  useRevokeCalendarSubscription: vi.fn(),
}))

describe('CalendarPage', () => {
  const create = vi.fn()
  const revoke = vi.fn()
  const download = vi.fn()
  const renderPage = () => render(<AppProvider><MemoryRouter><CalendarPage /></MemoryRouter></AppProvider>)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCalendarSubscription).mockReturnValue({ isPending: false, data: { active: false, createdAt: null } } as never)
    vi.mocked(useCalendarEvents).mockReturnValue({ isPending: false, data: [{ uid: 'deadline-1', kind: 'DEADLINE', applicationId: 'app-1', summary: 'Deadline: Acme — Engineer', description: 'Apply', location: null, startsAt: new Date().toISOString(), endsAt: new Date().toISOString() }] } as never)
    vi.mocked(useCreateCalendarSubscription).mockReturnValue({ mutateAsync: create, isPending: false } as never)
    vi.mocked(useRevokeCalendarSubscription).mockReturnValue({ mutateAsync: revoke, isPending: false } as never)
    vi.mocked(useDownloadCalendar).mockReturnValue({ mutate: download, isPending: false } as never)
  })

  it('downloads a snapshot and displays a newly created private subscription URL', async () => {
    const user = userEvent.setup()
    create.mockResolvedValue({ url: 'https://example.test/api/calendar/feed/secret' })
    renderPage()

    expect(screen.getAllByText('Deadline: Acme — Engineer')).not.toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Download .ics' }))
    await user.click(screen.getByRole('button', { name: 'Create subscription link' }))

    expect(download).toHaveBeenCalledOnce()
    expect(create).toHaveBeenCalledOnce()
    expect(screen.getByRole('textbox', { name: 'Calendar subscription URL' })).toHaveValue('https://example.test/api/calendar/feed/secret')
    expect(screen.getByText(/Anyone with this link/)).toBeInTheDocument()
  })

  it('replaces or revokes an active subscription', async () => {
    const user = userEvent.setup()
    vi.mocked(useCalendarSubscription).mockReturnValue({ isPending: false, data: { active: true, createdAt: '2026-08-12T12:00:00Z' } } as never)
    create.mockResolvedValue({ url: 'https://example.test/replacement' })
    revoke.mockResolvedValue(undefined)
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Replace subscription link' }))
    expect(create).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Revoke link' }))
    expect(revoke).toHaveBeenCalledOnce()
  })

  it('renders a safe error state', () => {
    vi.mocked(useCalendarSubscription).mockReturnValue({ isPending: false, isError: true, error: new Error('Calendar unavailable') } as never)
    renderPage()
    expect(screen.getByText('Calendar unavailable')).toBeInTheDocument()
  })
})
