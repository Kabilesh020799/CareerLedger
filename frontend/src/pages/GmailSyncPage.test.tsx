import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { useApplicationOptions } from '../hooks/useApplicationOptions'
import { useDisconnectGmail } from '../hooks/useDisconnectGmail'
import { useGmailStatus } from '../hooks/useGmailStatus'
import { useGmailUpdateReviews } from '../hooks/useGmailUpdateReviews'
import { useResolveGmailUpdateReview } from '../hooks/useResolveGmailUpdateReview'
import { useSyncGmail } from '../hooks/useSyncGmail'
import { useUpdateGmailSchedule } from '../hooks/useUpdateGmailSchedule'
import { useResumeVersions } from '../hooks/useResumeVersions'
import { GmailSyncPage } from './GmailSyncPage'

vi.mock('../hooks/useGmailStatus', () => ({ useGmailStatus: vi.fn() }))
vi.mock('../hooks/useSyncGmail', () => ({ useSyncGmail: vi.fn() }))
vi.mock('../hooks/useUpdateGmailSchedule', () => ({ useUpdateGmailSchedule: vi.fn() }))
vi.mock('../hooks/useDisconnectGmail', () => ({ useDisconnectGmail: vi.fn() }))
vi.mock('../hooks/useApplicationOptions', () => ({ useApplicationOptions: vi.fn() }))
vi.mock('../hooks/useGmailUpdateReviews', () => ({ useGmailUpdateReviews: vi.fn() }))
vi.mock('../hooks/useResolveGmailUpdateReview', () => ({ useResolveGmailUpdateReview: vi.fn() }))
vi.mock('../hooks/useResumeVersions', () => ({ useResumeVersions: vi.fn() }))
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
    vi.mocked(useUpdateGmailSchedule).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
    } as never)
    vi.mocked(useGmailUpdateReviews).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [],
    } as never)
    vi.mocked(useApplicationOptions).mockReturnValue({
      isPending: false,
      isError: false,
      data: [],
    } as never)
    vi.mocked(useResumeVersions).mockReturnValue({
      isPending: false,
      isError: false,
      data: [],
    } as never)
    vi.mocked(useResolveGmailUpdateReview).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
      isError: false,
    } as never)
    vi.mocked(useResumeVersions).mockReturnValue({
      isPending: false,
      isError: false,
      data: [{ id: 'resume-1', name: 'Backend', notes: null }],
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

    expect(screen.getByText('Email sync is not configured')).toBeInTheDocument()
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
        analyzedMessages: 3,
        detectedUpdates: 2,
        lastSyncedAt: '2026-08-09T21:00:00.000Z',
      },
    } as never)

    renderPage('/gmail?connected=true')

    expect(screen.getByText('gmail@example.com')).toBeInTheDocument()
    expect(screen.getByText('12 unique message references stored')).toBeInTheDocument()
    expect(screen.getByText(/2 new and 1 previously stored/)).toBeInTheDocument()
    expect(screen.getByText(/3 messages checked and 2 new recruitment updates added for review/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sync now' }))
    expect(mutate).toHaveBeenCalledOnce()
  })

  it('explains that a manual synchronization continues in the background', () => {
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
    vi.mocked(useSyncGmail).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      isSuccess: false,
      isError: false,
    } as never)

    renderPage()

    expect(screen.getByText('Synchronization is running in the background')).toBeInTheDocument()
    expect(screen.getByText(/ambiguous messages are analyzed/)).toBeInTheDocument()
  })

  it('enables automatic synchronization with the selected interval', async () => {
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
        automaticSync: { enabled: false, intervalMinutes: 60, lastAttemptAt: null, lastError: null },
      },
    } as never)
    vi.mocked(useUpdateGmailSchedule).mockReturnValue({ mutate, isPending: false, isError: false } as never)

    renderPage()
    await user.selectOptions(screen.getByLabelText('Automatic synchronization interval'), '180')
    await user.click(screen.getByRole('button', { name: 'Enable automatic sync' }))

    expect(mutate).toHaveBeenCalledWith({ enabled: true, intervalMinutes: 180 })
  })

  it('shows a matched review and applies an editable decision', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useGmailStatus).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: {
        configured: true,
        connected: true,
        gmailEmail: 'gmail@example.com',
        lastSyncedAt: null,
        synchronizedMessages: 1,
      },
    } as never)
    vi.mocked(useGmailUpdateReviews).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [
        {
          id: 'review-1',
          suggestedStatus: 'INTERVIEW',
          suggestedCompany: 'Acme',
          suggestedJobTitle: 'Engineer',
          subject: 'Interview invitation',
          sender: 'Acme Recruiting <jobs@acme.com>',
          receivedAt: '2026-08-09T12:00:00.000Z',
          matchConfidence: 95,
          status: 'PENDING',
          createdAt: '2026-08-09T12:00:00.000Z',
          application: {
            id: 'application-1',
            company: 'Acme',
            jobTitle: 'Engineer',
            status: 'APPLIED',
          },
        },
      ],
    } as never)
    vi.mocked(useApplicationOptions).mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        {
          id: 'application-1',
          company: 'Acme',
          jobTitle: 'Engineer',
          status: 'APPLIED',
        },
      ],
    } as never)
    vi.mocked(useResolveGmailUpdateReview).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync,
      isPending: false,
      isError: false,
    } as never)

    renderPage()

    expect(screen.getByText('Interview invitation')).toBeInTheDocument()
    expect(screen.getByText(/95% confidence/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apply update' }))
    expect(mutateAsync).toHaveBeenCalledWith({
      id: 'review-1',
      input: {
        action: 'CONFIRM',
        applicationId: 'application-1',
        status: 'INTERVIEW',
      },
    })
  })

  it('creates or ignores an unmatched suggestion only after user action', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useGmailStatus).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: {
        configured: true,
        connected: true,
        gmailEmail: 'gmail@example.com',
        lastSyncedAt: null,
        synchronizedMessages: 1,
      },
    } as never)
    vi.mocked(useGmailUpdateReviews).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [
        {
          id: 'review-new',
          suggestedStatus: 'APPLIED',
          suggestedCompany: 'Northstar',
          suggestedJobTitle: 'Platform Engineer',
          subject: 'Thank you for applying for Platform Engineer',
          sender: 'Northstar <jobs@northstar.example>',
          receivedAt: null,
          matchConfidence: 0,
          status: 'PENDING',
          createdAt: '2026-08-09T12:00:00.000Z',
          application: null,
        },
      ],
    } as never)
    vi.mocked(useResolveGmailUpdateReview).mockReturnValue({
      mutate,
      mutateAsync,
      isPending: false,
      isError: false,
    } as never)

    renderPage()

    expect(screen.getByText('No confident application match')).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Resume tag' }))
    await user.click(screen.getByRole('option', { name: 'Backend' }))
    const resume = new File(['%PDF-1.7'], 'resume.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText('Attach resume'), resume)
    await user.click(screen.getByRole('button', { name: 'Create application' }))
    expect(mutateAsync).toHaveBeenCalledWith({
      id: 'review-new',
      input: {
        action: 'CREATE_APPLICATION',
        company: 'Northstar',
        jobTitle: 'Platform Engineer',
        status: 'APPLIED',
        resumeVersionId: 'resume-1',
      },
      resume,
    })

    await user.click(screen.getByRole('button', { name: 'Ignore' }))
    expect(mutate).toHaveBeenCalledWith({
      id: 'review-new',
      input: { action: 'IGNORE' },
    })
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
