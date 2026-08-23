import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { useApplication } from '../hooks/useApplication'
import { useDeleteApplication } from '../hooks/useDeleteApplication'
import { useDownloadApplicationResume } from '../hooks/useDownloadApplicationResume'
import { useDownloadApplicationCoverLetter } from '../hooks/useDownloadApplicationCoverLetter'
import { useMoveApplication } from '../hooks/useMoveApplication'
import { ApplicationDetailsPage } from './ApplicationDetailsPage'

vi.mock('../hooks/useApplication', () => ({ useApplication: vi.fn() }))
vi.mock('../hooks/useDeleteApplication', () => ({ useDeleteApplication: vi.fn() }))
vi.mock('../hooks/useDownloadApplicationResume', () => ({ useDownloadApplicationResume: vi.fn() }))
vi.mock('../hooks/useDownloadApplicationCoverLetter', () => ({ useDownloadApplicationCoverLetter: vi.fn() }))
vi.mock('../hooks/useMoveApplication', () => ({ useMoveApplication: vi.fn() }))
vi.mock('../components/applications/DeleteApplicationDialog', () => ({
  DeleteApplicationDialog: () => <button>Delete</button>,
}))
vi.mock('../components/applications/ApplicationTimeline', () => ({
  ApplicationTimeline: () => <div>Timeline</div>,
}))
vi.mock('../components/reminders/ApplicationReminders', () => ({
  ApplicationReminders: () => <div>Reminders</div>,
}))

const download = vi.fn()
const downloadCoverLetter = vi.fn()
const move = vi.fn()

const applicationData = {
  id: 'application-1',
  company: 'Acme Corp',
  jobTitle: 'Software Engineer',
  location: null,
  jobUrl: null,
  source: null,
  status: 'SAVED' as const,
  notes: null,
  appliedAt: null,
  resumeVersion: null,
  resumeAttachment: {
    fileName: 'Software_Engineer_Acme_Corp.pdf',
    mimeType: 'application/pdf',
    size: 2048,
    createdAt: '2026-08-10T00:00:00.000Z',
  },
  coverLetterAttachment: {
    fileName: 'Software_Engineer_Acme_Corp_Cover_Letter.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    createdAt: '2026-08-10T00:00:00.000Z',
  },
  createdAt: '2026-08-10T00:00:00.000Z',
  updatedAt: '2026-08-10T00:00:00.000Z',
}

describe('ApplicationDetailsPage resume attachment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useDeleteApplication).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
    } as never)
    vi.mocked(useDownloadApplicationResume).mockReturnValue({
      mutate: download,
      isPending: false,
      isError: false,
    } as never)
    vi.mocked(useDownloadApplicationCoverLetter).mockReturnValue({
      mutate: downloadCoverLetter,
      isPending: false,
      isError: false,
    } as never)
    vi.mocked(useMoveApplication).mockReturnValue({ mutate: move, isPending: false } as never)
    vi.mocked(useApplication).mockReturnValue({
      isPending: false,
      isError: false,
      data: applicationData,
    } as never)
  })
  afterEach(cleanup)

  it('shows and downloads the resume using its generated filename', async () => {
    const user = userEvent.setup()
    render(
      <AppProvider>
        <MemoryRouter initialEntries={['/applications/application-1']}>
          <Routes>
            <Route path="/applications/:id" element={<ApplicationDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </AppProvider>,
    )

    expect(screen.getByText('Software_Engineer_Acme_Corp.pdf')).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Change application status' }))
    await user.click(screen.getByRole('option', { name: 'Interview' }))
    expect(move).toHaveBeenCalledWith({ id: 'application-1', status: 'INTERVIEW' })
    expect(screen.getByRole('link', { name: 'Add note' })).toHaveAttribute('href', '#timeline')
    await user.click(screen.getByRole('button', { name: 'Download resume' }))

    expect(download).toHaveBeenCalledWith({
      applicationId: 'application-1',
      fileName: 'Software_Engineer_Acme_Corp.pdf',
    })
    expect(screen.getByText('Software_Engineer_Acme_Corp_Cover_Letter.pdf')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Download cover letter' }))
    expect(downloadCoverLetter).toHaveBeenCalledWith({
      applicationId: 'application-1',
      fileName: 'Software_Engineer_Acme_Corp_Cover_Letter.pdf',
    })
  })

  it('does not render a legacy unsafe job URL as a link', () => {
    vi.mocked(useApplication).mockReturnValue({
      isPending: false,
      isError: false,
      data: { ...applicationData, jobUrl: 'javascript:alert(1)' },
    } as never)

    render(
      <AppProvider>
        <MemoryRouter initialEntries={['/applications/application-1']}>
          <Routes>
            <Route path="/applications/:id" element={<ApplicationDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </AppProvider>,
    )

    expect(screen.queryByRole('link', { name: 'Open job posting' })).not.toBeInTheDocument()
    expect(screen.getByText('Job URL').parentElement).toHaveTextContent('Not provided')
  })
})
