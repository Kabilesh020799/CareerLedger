import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { workspaceService } from '../services/workspace.service'
import { TeamSettingsPage } from './TeamSettingsPage'

vi.mock('../contexts/WorkspaceContext', () => ({ workspaceQueryKey: ['workspaces'], useWorkspace: vi.fn() }))
vi.mock('../services/workspace.service', () => ({ workspaceService: { members: vi.fn(), invite: vi.fn(), create: vi.fn() } }))

describe('TeamSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useWorkspace).mockReturnValue({ workspaceId: 'workspace-1', memberships: [{ workspace: { id: 'workspace-1', name: 'Search team' } }] } as never)
    vi.mocked(workspaceService.members).mockResolvedValue([])
  })
  afterEach(cleanup)

  it('validates invitation and workspace forms before sending requests', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(<AppProvider><QueryClientProvider client={queryClient}><TeamSettingsPage /></QueryClientProvider></AppProvider>)

    await user.type(screen.getByLabelText('Email address'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Create invitation' }))
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(workspaceService.invite).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Create workspace' }))
    expect(await screen.findByText('Enter a workspace name')).toBeInTheDocument()
    expect(workspaceService.create).not.toHaveBeenCalled()
  })
})
