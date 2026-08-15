import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { AppProvider } from '../components/ui/AppProvider'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { dataTransferService } from '../services/data-transfer.service'
import { DataSettingsPage } from './DataSettingsPage'

vi.mock('../contexts/WorkspaceContext', () => ({ useWorkspace: vi.fn() }))
vi.mock('../services/data-transfer.service', () => ({ dataTransferService: { exportWorkspace: vi.fn(), importWorkspace: vi.fn() } }))

describe('DataSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useWorkspace).mockReturnValue({ workspaceId: 'workspace-1' } as never)
  })
  afterEach(cleanup)

  it('reviews a valid backup before importing it', async () => {
    const user = userEvent.setup()
    vi.mocked(dataTransferService.importWorkspace).mockResolvedValue({ created: 2, skipped: 1, total: 3 })
    render(<AppProvider><DataSettingsPage /></AppProvider>)

    expect(screen.getByText('Choose JSON backup')).toBeVisible()
    expect(screen.getByText('No file selected')).toBeVisible()

    const application = { company: 'Acme', jobTitle: 'Engineer', status: 'APPLIED', events: [], reminders: [] }
    const document = { schemaVersion: 1, exportedAt: '2026-08-15T12:00:00.000Z', workspace: { name: 'Search team' }, applications: [application, application, application] }
    const backup = new File([JSON.stringify(document)], 'backup.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText('Import JSON backup'), backup)

    expect(await screen.findAllByText('backup.json')).toHaveLength(2)
    expect(await screen.findByText(/contains 3 applications from Search team/)).toBeInTheDocument()
    expect(dataTransferService.importWorkspace).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Import applications' }))

    await waitFor(() => expect(dataTransferService.importWorkspace).toHaveBeenCalledWith('workspace-1', document))
    expect(await screen.findByText('Imported 2 applications; skipped 1 duplicate.')).toBeInTheDocument()
  })

  it('rejects an invalid backup before contacting the API', async () => {
    const user = userEvent.setup()
    render(<AppProvider><DataSettingsPage /></AppProvider>)
    await user.upload(screen.getByLabelText('Import JSON backup'), new File(['not json'], 'bad.json', { type: 'application/json' }))
    expect(await screen.findByText('This is not a valid Job Tracker backup.')).toBeInTheDocument()
    expect(dataTransferService.importWorkspace).not.toHaveBeenCalled()
  })
})
