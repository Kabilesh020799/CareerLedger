import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { useApplicationBoard } from '../hooks/useApplicationBoard'
import { useMoveApplication } from '../hooks/useMoveApplication'
import { useStartSprint } from '../hooks/useStartSprint'
import type { Application } from '../types/application'
import { ApplicationBoardPage } from './ApplicationBoardPage'

vi.mock('../hooks/useApplicationBoard', () => ({ useApplicationBoard: vi.fn() }))
vi.mock('../hooks/useMoveApplication', () => ({ useMoveApplication: vi.fn() }))
vi.mock('../hooks/useStartSprint', () => ({ useStartSprint: vi.fn() }))

const application = {
  id: 'application-1',
  company: 'Acme Corp',
  jobTitle: 'Software Engineer',
  location: 'Remote',
  jobUrl: null,
  source: 'LinkedIn',
  status: 'APPLIED',
  notes: null,
  appliedAt: '2026-08-08T12:00:00.000Z',
  createdAt: '2026-08-08T12:00:00.000Z',
  updatedAt: '2026-08-08T12:00:00.000Z',
} satisfies Application

function moveResult(overrides: Record<string, unknown> = {}) {
  return {
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    variables: undefined,
    data: undefined,
    error: null,
    ...overrides,
  }
}

function startResult(overrides: Record<string, unknown> = {}) {
  return {
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    data: undefined,
    error: null,
    ...overrides,
  }
}

const sprint = {
  id: 'sprint-1',
  userId: 'user-1',
  workspaceId: 'workspace-1',
  name: 'Sprint 1',
  sequence: 1,
  status: 'ACTIVE' as const,
  startedAt: '2026-08-08T12:00:00.000Z',
  closedAt: null,
  createdAt: '2026-08-08T12:00:00.000Z',
  updatedAt: '2026-08-08T12:00:00.000Z',
}

function renderPage() {
  return render(
    <AppProvider>
      <MemoryRouter>
        <ApplicationBoardPage />
      </MemoryRouter>
    </AppProvider>,
  )
}

describe('ApplicationBoardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useMoveApplication).mockReturnValue(moveResult() as never)
    vi.mocked(useStartSprint).mockReturnValue(startResult() as never)
  })
  afterEach(cleanup)

  it('shows applications in their current mobile status with counts and detail links', async () => {
    const user = userEvent.setup()
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { sprint, applications: [application] },
    } as never)

    renderPage()

    const appliedColumn = screen.getByRole('tabpanel', { name: /Applied/ })
    expect(within(appliedColumn).getByRole('article', { name: 'Acme Corp, Software Engineer' })).toBeInTheDocument()
    expect(within(appliedColumn).getByText('1')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Acme Corp' })).toHaveAttribute('href', '/applications/application-1')
    await user.click(screen.getByRole('tab', { name: 'Interview 0' }))
    const interviewColumn = screen.getByRole('tabpanel', { name: /Interview/ })
    expect(within(interviewColumn).getByText('0')).toBeInTheDocument()
  })

  it('moves an application with its accessible status control', async () => {
    const user = userEvent.setup()
    const moveApplication = moveResult()
    vi.mocked(useMoveApplication).mockReturnValue(moveApplication as never)
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { sprint, applications: [application] },
    } as never)

    renderPage()
    await user.click(screen.getByRole('button', { name: 'Move Acme Corp to another status' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Interview' }))

    expect(moveApplication.mutate).toHaveBeenCalledWith({
      id: application.id,
      status: 'INTERVIEW',
    })
  })

  it('moves a dragged application when it is dropped on another column', async () => {
    const user = userEvent.setup()
    const moveApplication = moveResult()
    vi.mocked(useMoveApplication).mockReturnValue(moveApplication as never)
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { sprint, applications: [application] },
    } as never)
    const storedData = new Map<string, string>()
    const setDragImage = vi.fn()
    const dataTransfer = {
      effectAllowed: 'none',
      getData: (type: string) => storedData.get(type) ?? '',
      setData: (type: string, value: string) => storedData.set(type, value),
      setDragImage,
    }

    renderPage()
    const card = screen.getByRole('article', { name: 'Acme Corp, Software Engineer' })
    fireEvent.dragStart(card, { dataTransfer })
    await user.click(screen.getByRole('tab', { name: 'Interview 0' }))
    const interviewColumn = screen.getByRole('tabpanel', { name: /Interview/ })
    fireEvent.dragEnter(interviewColumn, { dataTransfer })
    fireEvent.dragOver(interviewColumn, { dataTransfer })
    fireEvent.drop(interviewColumn, { dataTransfer })

    expect(setDragImage).toHaveBeenCalledWith(card, 0, 0)
    expect(moveApplication.mutate).toHaveBeenCalledWith({
      id: application.id,
      status: 'INTERVIEW',
    })
  })

  it('shows empty and loading states', () => {
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { sprint, applications: [] },
    } as never)
    const { unmount } = renderPage()
    expect(screen.getByRole('heading', { name: 'No applications on your board' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create your first application' })).toHaveAttribute('href', '/applications/new')

    unmount()
    vi.mocked(useApplicationBoard).mockReturnValue({ isPending: true } as never)
    renderPage()
    expect(screen.getByLabelText('Loading application board')).toBeInTheDocument()
  })

  it('shows load and move failures with recovery actions', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()
    const reset = vi.fn()
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: true,
      isSuccess: false,
      error: new Error('Load failed'),
      refetch,
    } as never)
    vi.mocked(useMoveApplication).mockReturnValue(moveResult({
      isError: true,
      error: new Error('Update failed'),
      reset,
    }) as never)

    renderPage()
    expect(screen.getByText('Load failed')).toBeInTheDocument()
    expect(screen.getByText('Update failed')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(refetch).toHaveBeenCalledOnce()
    expect(reset).toHaveBeenCalledOnce()
  })

  it('starts a new sprint from the board and shows the current sprint summary', async () => {
    const user = userEvent.setup()
    const start = startResult()
    vi.mocked(useStartSprint).mockReturnValue(start as never)
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { sprint, applications: [application] },
    } as never)

    renderPage()

    expect(screen.getByRole('heading', { name: 'Sprint 1' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start new sprint' }))
    expect(start.mutate).toHaveBeenCalledWith({})
  })

  it('communicates carried-over and closed-rejected counts after starting a sprint', () => {
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { sprint, applications: [application] },
    } as never)
    vi.mocked(useStartSprint).mockReturnValue(startResult({
      isSuccess: true,
      data: {
        sprint: { ...sprint, id: 'sprint-2', name: 'Sprint 2', sequence: 2 },
        previousSprint: sprint,
        carriedOverCount: 2,
        closedRejectedCount: 1,
      },
    }) as never)

    renderPage()

    expect(screen.getByText(/2 applications carried over\. 1 rejected application closed in the previous sprint\./)).toBeInTheDocument()
  })

  it('shows a recoverable sprint-start failure', async () => {
    const user = userEvent.setup()
    const reset = vi.fn()
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { sprint, applications: [application] },
    } as never)
    vi.mocked(useStartSprint).mockReturnValue(startResult({
      isError: true,
      error: new Error('Start failed'),
      reset,
    }) as never)

    renderPage()

    expect(screen.getByText('Start failed')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(reset).toHaveBeenCalledOnce()
  })

  it('shows the first-sprint state when no sprint is active', () => {
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { sprint: null, applications: [] },
    } as never)

    renderPage()

    expect(screen.getByRole('heading', { name: 'No active sprint' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Start sprint' })).toHaveLength(1)
  })
})
