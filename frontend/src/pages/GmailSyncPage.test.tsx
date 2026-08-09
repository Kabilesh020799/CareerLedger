import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { useDisconnectGmail } from '../hooks/useDisconnectGmail'
import { useGmailStatus } from '../hooks/useGmailStatus'
import { useSyncGmail } from '../hooks/useSyncGmail'
import { GmailSyncPage } from './GmailSyncPage'

vi.mock('../hooks/useGmailStatus', () => ({ useGmailStatus: vi.fn() }))
vi.mock('../hooks/useSyncGmail', () => ({ useSyncGmail: vi.fn() }))
vi.mock('../hooks/useDisconnectGmail', () => ({ useDisconnectGmail: vi.fn() }))
vi.mock('../services/gmail.service', () => ({
  gmailConnectUrl: 'http://localhost:3000/api/gmail/connect',
}))

function renderPage(route = '/gmail') {
  return render(
    <AppProvider>
      <MemoryRouter initialEntries={[route]}><GmailSyncPage /></MemoryRouter>
    </AppProvider>,
  )
}

describe('GmailSyncPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSyncGmail).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
    } as never)
    vi.mocked(useDisconnectGmail).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
    } as never)
  })
  afterEach(cleanup)

  it('explains when Gmail has not been configured', () => {
    vi.mocked(useGmailStatus).mockReturnValue({
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
    } as never)

    renderPage()

    expect(screen.getByText('Gmail integration is unavailable')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Authorize Gmail' })).not.toBeInTheDocument()
  })

  it('offers authorization without exposing credentials', () => {
    vi.mocked(useGmailStatus).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: {
        configured: true,
        connected: false,
        gmailEmail: null,
        lastSyncedAt: null,
        synchronizedMessages: 0,
      },
    } as never)

    renderPage()

    expect(screen.getByRole('link', { name: 'Authorize Gmail' })).toHaveAttribute(
      'href',
      'http://localhost:3000/api/gmail/connect',
    )
    expect(screen.getByText(/read-only message metadata access/)).toBeInTheDocument()
  })

  it('shows connected state and starts a manual synchronization', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    vi.mocked(useGmailStatus).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: {
        configured: true,
        connected: true,
        gmailEmail: 'gmail@example.com',
        lastSyncedAt: '2026-08-09T21:00:00.000Z',
        synchronizedMessages: 12,
      },
    } as never)
    vi.mocked(useSyncGmail).mockReturnValue({
      mutate,
      isPending: false,
      isSuccess: true,
      isError: false,
      data: {
        synchronizationType: 'incremental',
        fetchedMessages: 3,
        newMessages: 2,
        duplicateMessages: 1,
        lastSyncedAt: '2026-08-09T21:00:00.000Z',
      },
    } as never)

    renderPage('/gmail?connected=true')

    expect(screen.getByText('gmail@example.com')).toBeInTheDocument()
    expect(screen.getByText('12 unique message references stored')).toBeInTheDocument()
    expect(screen.getByText(/2 new and 1 previously stored/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sync now' }))
    expect(mutate).toHaveBeenCalledOnce()
  })

  it('confirms before disconnecting Gmail', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    vi.mocked(useGmailStatus).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: {
        configured: true,
        connected: true,
        gmailEmail: 'gmail@example.com',
        lastSyncedAt: null,
        synchronizedMessages: 0,
      },
    } as never)
    vi.mocked(useDisconnectGmail).mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
    } as never)

    renderPage()
    await user.click(screen.getByRole('button', { name: 'Disconnect Gmail' }))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('Your tracked applications will not change.')
    await user.click(screen.getAllByRole('button', { name: 'Disconnect Gmail' }).at(-1)!)
    expect(mutate).toHaveBeenCalledOnce()
  })
})
