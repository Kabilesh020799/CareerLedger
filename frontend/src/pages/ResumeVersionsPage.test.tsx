import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { useCreateResumeVersion } from '../hooks/useCreateResumeVersion'
import { useDeleteResumeVersion } from '../hooks/useDeleteResumeVersion'
import { useResumeVersions } from '../hooks/useResumeVersions'
import { useUpdateResumeVersion } from '../hooks/useUpdateResumeVersion'
import { ResumeVersionsPage } from './ResumeVersionsPage'

vi.mock('../hooks/useResumeVersions', () => ({ useResumeVersions: vi.fn() }))
vi.mock('../hooks/useCreateResumeVersion', () => ({ useCreateResumeVersion: vi.fn() }))
vi.mock('../hooks/useUpdateResumeVersion', () => ({ useUpdateResumeVersion: vi.fn() }))
vi.mock('../hooks/useDeleteResumeVersion', () => ({ useDeleteResumeVersion: vi.fn() }))

const resumeVersion = {
  id: 'resume-1',
  name: 'Full-stack resume',
  notes: 'TypeScript and React focus',
  createdAt: '2026-08-09T12:00:00.000Z',
  updatedAt: '2026-08-09T12:00:00.000Z',
}

const createMutation = { mutateAsync: vi.fn(), isPending: false, error: null }
const updateMutation = { mutateAsync: vi.fn(), isPending: false, variables: undefined, error: null }
const deleteMutation = { mutate: vi.fn(), isPending: false, variables: undefined, error: null }

function renderPage() {
  return render(<AppProvider><ResumeVersionsPage /></AppProvider>)
}

describe('ResumeVersionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createMutation.mutateAsync.mockResolvedValue(resumeVersion)
    updateMutation.mutateAsync.mockResolvedValue(resumeVersion)
    vi.mocked(useCreateResumeVersion).mockReturnValue(createMutation as never)
    vi.mocked(useUpdateResumeVersion).mockReturnValue(updateMutation as never)
    vi.mocked(useDeleteResumeVersion).mockReturnValue(deleteMutation as never)
  })
  afterEach(cleanup)

  it('creates a validated resume version', async () => {
    const user = userEvent.setup()
    vi.mocked(useResumeVersions).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [],
    } as never)
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Add resume version' }))
    expect(screen.getByText('Name is required')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/^Name/), 'Full-stack resume')
    await user.type(screen.getByLabelText('Notes'), 'TypeScript focus')
    await user.click(screen.getByRole('button', { name: 'Add resume version' }))

    expect(createMutation.mutateAsync).toHaveBeenCalledWith({
      name: 'Full-stack resume',
      notes: 'TypeScript focus',
    })
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

    const card = screen.getByRole('article', { name: 'Full-stack resume' })
    await user.click(within(card).getByRole('button', { name: 'Edit' }))
    const name = within(card).getByLabelText(/^Name/)
    await user.clear(name)
    await user.type(name, 'Backend resume')
    await user.click(within(card).getByRole('button', { name: 'Save resume version' }))
    expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
      id: 'resume-1',
      input: { name: 'Backend resume', notes: 'TypeScript and React focus' },
    })

    await user.click(within(card).getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete resume version' }))
    expect(deleteMutation.mutate).toHaveBeenCalledWith('resume-1')
  })
})
