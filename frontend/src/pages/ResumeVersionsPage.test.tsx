import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { useDeleteResumeVersion } from '../hooks/useDeleteResumeVersion'
import { useCreateResumeVersion } from '../hooks/useCreateResumeVersion'
import { useResumeVersions } from '../hooks/useResumeVersions'
import { useUploadedResumes } from '../hooks/useUploadedResumes'
import { useUpdateResumeVersion } from '../hooks/useUpdateResumeVersion'
import { ResumeVersionsPage } from './ResumeVersionsPage'
import { applicationService } from '../services/application.service'
import { apiBaseUrl } from '../services/api'

vi.mock('../hooks/useResumeVersions', () => ({ useResumeVersions: vi.fn() }))
vi.mock('../hooks/useUploadedResumes', () => ({ useUploadedResumes: vi.fn() }))
vi.mock('../hooks/useUpdateResumeVersion', () => ({ useUpdateResumeVersion: vi.fn() }))
vi.mock('../hooks/useDeleteResumeVersion', () => ({ useDeleteResumeVersion: vi.fn() }))
vi.mock('../hooks/useCreateResumeVersion', () => ({ useCreateResumeVersion: vi.fn() }))
vi.mock('../services/application.service', () => ({ applicationService: { downloadResume: vi.fn() } }))

const resumeVersion = {
  id: 'resume-1',
  name: 'Full-stack resume',
  notes: 'TypeScript and React focus',
  createdAt: '2026-08-09T12:00:00.000Z',
  updatedAt: '2026-08-09T12:00:00.000Z',
}

const updateMutation = { mutateAsync: vi.fn(), isPending: false, variables: undefined, error: null }
const deleteMutation = { mutate: vi.fn(), isPending: false, variables: undefined, error: null }
const createMutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, error: null }

function renderPage() {
  return render(<AppProvider><ResumeVersionsPage /></AppProvider>)
}

describe('ResumeVersionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:resume-preview'), revokeObjectURL: vi.fn() })
    vi.mocked(applicationService.downloadResume).mockResolvedValue(new Blob(['resume'], { type: 'application/pdf' }))
    updateMutation.mutateAsync.mockResolvedValue(resumeVersion)
    createMutation.mutateAsync.mockResolvedValue(resumeVersion)
    vi.mocked(useCreateResumeVersion).mockReturnValue(createMutation as never)
    vi.mocked(useUpdateResumeVersion).mockReturnValue(updateMutation as never)
    vi.mocked(useDeleteResumeVersion).mockReturnValue(deleteMutation as never)
    vi.mocked(useUploadedResumes).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [],
    } as never)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('creates suggested and custom tags without changing the uploaded resume library', async () => {
    const user = userEvent.setup()
    vi.mocked(useResumeVersions).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [],
    } as never)
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Strategy tags' }))
    await user.click(screen.getByRole('button', { name: '+ Backend' }))
    expect(createMutation.mutate).toHaveBeenCalledWith({ name: 'Backend', notes: null })
    await user.type(screen.getByLabelText(/^Tag name/), 'Leadership')
    await user.click(screen.getByRole('button', { name: 'Add custom tag' }))
    expect(createMutation.mutateAsync).toHaveBeenCalledWith({ name: 'Leadership', notes: null })
  })

  it('edits and deletes an existing resume version', async () => {
    const user = userEvent.setup()
    vi.mocked(useResumeVersions).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [resumeVersion],
    } as never)
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Strategy tags' }))
    const card = screen.getByRole('article', { name: 'Full-stack resume' })
    await user.click(within(card).getByRole('button', { name: 'Edit' }))
    const name = within(card).getByLabelText(/^Tag name/)
    await user.clear(name)
    await user.type(name, 'Backend resume')
    await user.click(within(card).getByRole('button', { name: 'Save tag' }))
    expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
      id: 'resume-1',
      input: { name: 'Backend resume', notes: null },
    })

    await user.click(within(card).getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete resume tag' }))
    expect(deleteMutation.mutate).toHaveBeenCalledWith('resume-1')
  })

  it('shows uploaded resumes in a private preview portal', async () => {
    const user = userEvent.setup()
    vi.mocked(useResumeVersions).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [],
    } as never)
    vi.mocked(useUploadedResumes).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [{
        id: 'attachment-1',
        applicationId: 'application-1',
        fileName: 'Engineer_Acme.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        createdAt: '2026-08-10T00:00:00.000Z',
        application: { company: 'Acme', jobTitle: 'Engineer' },
      }],
    } as never)
    renderPage()

    expect(screen.getByRole('article', { name: 'Engineer_Acme.pdf' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'View resume' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTitle('Preview of Engineer_Acme.pdf')).toHaveAttribute('src', 'blob:resume-preview'))
    expect(screen.getByRole('link', { name: 'Open in new tab' })).toHaveAttribute(
      'href',
      `${apiBaseUrl}/applications/application-1/resume`,
    )
  })
})
