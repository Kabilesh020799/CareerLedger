import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { useApplicationBoard } from '../hooks/useApplicationBoard'
import { useArchivedSprints } from '../hooks/useArchivedSprints'
import { useMoveApplication } from '../hooks/useMoveApplication'
import { useScheduleSprint } from '../hooks/useScheduleSprint'
import { useScheduledSprints } from '../hooks/useScheduledSprints'
import { useStartSprint } from '../hooks/useStartSprint'
import type { Application } from '../types/application'
import { ApplicationBoardPage } from './ApplicationBoardPage'

vi.mock('../hooks/useApplicationBoard', () => ({ useApplicationBoard: vi.fn() }))
vi.mock('../hooks/useArchivedSprints', () => ({ useArchivedSprints: vi.fn() }))
vi.mock('../hooks/useMoveApplication', () => ({ useMoveApplication: vi.fn() }))
vi.mock('../hooks/useScheduleSprint', () => ({ useScheduleSprint: vi.fn() }))
vi.mock('../hooks/useScheduledSprints', () => ({
  useScheduledSprints: vi.fn(),
  useSprintTimelineNow: vi.fn(() => Date.now()),
}))
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

const futureEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
const expiredEndsAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

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

function scheduleResult(overrides: Record<string, unknown> = {}) {
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
  scheduledStartAt: null,
  durationDays: 14,
  endsAt: futureEndsAt,
  startedAt: '2026-08-08T12:00:00.000Z',
  closedAt: null,
  createdAt: '2026-08-08T12:00:00.000Z',
  updatedAt: '2026-08-08T12:00:00.000Z',
}

const archivedSprint = {
  ...sprint,
  id: 'sprint-0',
  name: 'Sprint 0',
  sequence: 0,
  status: 'CLOSED' as const,
  endsAt: '2026-08-07T12:00:00.000Z',
  startedAt: '2026-07-24T12:00:00.000Z',
  closedAt: '2026-08-07T12:00:00.000Z',
}

const scheduledSprint = {
  ...sprint,
  id: 'sprint-scheduled',
  name: 'Interview push',
  sequence: 2,
  status: 'SCHEDULED' as const,
  scheduledStartAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  startedAt: new Date().toISOString(),
  endsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
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
    vi.mocked(useArchivedSprints).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [],
    } as never)
    vi.mocked(useScheduledSprints).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [],
    } as never)
    vi.mocked(useMoveApplication).mockReturnValue(moveResult() as never)
    vi.mocked(useScheduleSprint).mockReturnValue(scheduleResult() as never)
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

  it('shows archived applications grouped by closed sprint with detail links and statuses', () => {
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { sprint, applications: [application] },
    } as never)
    vi.mocked(useArchivedSprints).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [{ sprint: archivedSprint, applications: [{ ...application, id: 'archived-1', status: 'REJECTED' as const }] }],
    } as never)

    renderPage()

    const archive = screen.getByRole('region', { name: 'Archived applications' })
    expect(within(archive).getByRole('heading', { name: 'Sprint 0' })).toBeInTheDocument()
    expect(within(archive).getByRole('link', { name: /Acme Corp.*Software Engineer/ })).toHaveAttribute('href', '/applications/archived-1')
    expect(within(archive).getByText('Rejected')).toBeInTheDocument()
  })

  it('shows multiple upcoming sprints with their planned windows', () => {
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { sprint, applications: [] },
    } as never)
    vi.mocked(useScheduledSprints).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [
        scheduledSprint,
        { ...scheduledSprint, id: 'sprint-later', name: 'Launch follow-up', scheduledStartAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
      ],
    } as never)

    renderPage()

    const upcoming = screen.getByRole('region', { name: 'Upcoming sprints' })
    expect(within(upcoming).getByRole('heading', { name: 'Interview push' })).toBeInTheDocument()
    expect(within(upcoming).getByRole('heading', { name: 'Launch follow-up' })).toBeInTheDocument()
    expect(within(upcoming).getAllByText('Duration: 14 days')).toHaveLength(2)
    expect(within(upcoming).getAllByText(/Scheduled start:/)).toHaveLength(2)
    expect(within(upcoming).getAllByText(/Calculated end:/)).toHaveLength(2)
  })

  it('shows upcoming loading, empty, and recoverable error states', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { sprint, applications: [] },
    } as never)
    vi.mocked(useScheduledSprints).mockReturnValue({ isPending: true } as never)

    const { unmount } = renderPage()
    expect(screen.getByLabelText('Loading upcoming sprints')).toBeInTheDocument()

    unmount()
    vi.mocked(useScheduledSprints).mockReturnValue({
      isPending: false,
      isError: true,
      isSuccess: false,
      error: new Error('Upcoming failed'),
      refetch,
    } as never)
    renderPage()
    expect(screen.getByText('Upcoming failed')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()

    unmount()
    vi.mocked(useScheduledSprints).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [],
    } as never)
    renderPage()
    expect(screen.getByText('No upcoming sprints scheduled.')).toBeInTheDocument()
  })

  it('validates and submits a scheduled sprint using the local start time', async () => {
    const user = userEvent.setup()
    const schedule = scheduleResult()
    vi.mocked(useScheduleSprint).mockReturnValue(schedule as never)
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { sprint, applications: [] },
    } as never)

    renderPage()
    await user.click(screen.getByRole('button', { name: 'Schedule sprint' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Schedule a sprint' })).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Sprint duration (days)')).toHaveValue(14)

    await user.click(within(dialog).getByRole('button', { name: 'Schedule sprint' }))
    expect(await within(dialog).findByText('Choose when the sprint should start')).toBeInTheDocument()
    expect(schedule.mutate).not.toHaveBeenCalled()

    const future = new Date(Date.now() + 48 * 60 * 60 * 1000)
    const localValue = new Date(future.getTime() - future.getTimezoneOffset() * 60 * 1000).toISOString().slice(0, 16)
    await user.type(within(dialog).getByLabelText('Sprint name (optional)'), 'Interview push')
    await user.clear(within(dialog).getByLabelText('Sprint duration (days)'))
    await user.type(within(dialog).getByLabelText('Sprint duration (days)'), '21')
    await user.type(within(dialog).getByLabelText('Scheduled start'), localValue)
    await user.click(within(dialog).getByRole('button', { name: 'Schedule sprint' }))

    expect(schedule.mutate).toHaveBeenCalledWith(
      { name: 'Interview push', durationDays: 21, startsAt: new Date(localValue).toISOString() },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('starts a due scheduled sprint only after the current sprint has ended', async () => {
    const user = userEvent.setup()
    const start = startResult()
    vi.mocked(useStartSprint).mockReturnValue(start as never)
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { sprint: { ...sprint, endsAt: expiredEndsAt }, applications: [] },
    } as never)
    vi.mocked(useScheduledSprints).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [{ ...scheduledSprint, scheduledStartAt: new Date(Date.now() - 60_000).toISOString() }],
    } as never)

    renderPage()

    const upcoming = screen.getByRole('region', { name: 'Upcoming sprints' })
    await user.click(within(upcoming).getByRole('button', { name: 'Start scheduled sprint' }))
    expect(start.mutate).toHaveBeenCalledWith({ scheduledSprintId: 'sprint-scheduled' })
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

  it('shows archived loading, empty, and recoverable error states', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { sprint, applications: [] },
    } as never)
    vi.mocked(useArchivedSprints).mockReturnValue({ isPending: true } as never)

    const { unmount } = renderPage()
    expect(screen.getByLabelText('Loading archived applications')).toBeInTheDocument()

    unmount()
    vi.mocked(useArchivedSprints).mockReturnValue({
      isPending: false,
      isError: true,
      isSuccess: false,
      error: new Error('Archive failed'),
      refetch,
    } as never)
    renderPage()
    expect(screen.getByText('Archive failed')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()

    unmount()
    vi.mocked(useArchivedSprints).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [],
    } as never)
    renderPage()
    expect(screen.getByText('No archived applications yet.')).toBeInTheDocument()
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

  it('shows the configured duration and blocks a next sprint before the end date', async () => {
    const user = userEvent.setup()
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { sprint, applications: [application] },
    } as never)

    renderPage()

    expect(screen.getByText(/Duration: 14 days/)).toBeInTheDocument()
    expect(screen.getByText(/Ends/)).toBeInTheDocument()
    expect(screen.getByText(/current sprint remains active until/)).toBeInTheDocument()
    const startButton = screen.getByRole('button', { name: 'Start new sprint' })
    expect(startButton).toBeDisabled()
    await user.click(startButton)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the next-sprint configuration and submits a validated duration', async () => {
    const user = userEvent.setup()
    const start = startResult()
    vi.mocked(useStartSprint).mockReturnValue(start as never)
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { sprint: { ...sprint, endsAt: expiredEndsAt }, applications: [application] },
    } as never)

    renderPage()

    expect(screen.getByRole('heading', { name: 'Sprint 1' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start new sprint' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Configure the next sprint' })).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Sprint duration (days)')).toHaveValue(14)
    await user.clear(within(dialog).getByLabelText('Sprint duration (days)'))
    await user.type(within(dialog).getByLabelText('Sprint duration (days)'), '21')
    await user.type(within(dialog).getByLabelText('Sprint name (optional)'), 'Focused sprint')
    await user.click(within(dialog).getByRole('button', { name: 'Start sprint' }))
    expect(start.mutate).toHaveBeenCalledWith(
      { name: 'Focused sprint', durationDays: 21 },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('notifies the user when the active sprint has ended', () => {
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { sprint: { ...sprint, endsAt: expiredEndsAt }, applications: [application] },
    } as never)

    renderPage()

    expect(screen.getByText('Sprint ended')).toBeInTheDocument()
    expect(screen.getByText('Sprint 1 has ended. Start the next sprint when you are ready.')).toBeInTheDocument()
  })

  it('validates the first-sprint configuration before submitting', async () => {
    const user = userEvent.setup()
    const start = startResult()
    vi.mocked(useStartSprint).mockReturnValue(start as never)
    vi.mocked(useApplicationBoard).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { sprint: null, applications: [] },
    } as never)

    renderPage()

    await user.click(screen.getAllByRole('button', { name: 'Start sprint' })[0])
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Configure your first sprint' })).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Sprint duration (days)')).toHaveValue(14)
    await user.clear(within(dialog).getByLabelText('Sprint duration (days)'))
    await user.type(within(dialog).getByLabelText('Sprint duration (days)'), '0')
    await user.click(within(dialog).getByRole('button', { name: 'Start sprint' }))

    expect(await within(dialog).findByText('Sprint duration must be at least 1 day')).toBeInTheDocument()
    expect(start.mutate).not.toHaveBeenCalled()

    await user.clear(within(dialog).getByLabelText('Sprint duration (days)'))
    await user.type(within(dialog).getByLabelText('Sprint duration (days)'), '91')
    await user.click(within(dialog).getByRole('button', { name: 'Start sprint' }))
    expect(await within(dialog).findByText('Sprint duration must be 90 days or fewer')).toBeInTheDocument()
    expect(start.mutate).not.toHaveBeenCalled()
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
