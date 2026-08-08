import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useApplicationEvents } from '../../hooks/useApplicationEvents'
import { useCreateApplicationEvent } from '../../hooks/useCreateApplicationEvent'
import { AppProvider } from '../ui/AppProvider'
import { ApplicationTimeline } from './ApplicationTimeline'

vi.mock('../../hooks/useApplicationEvents', () => ({ useApplicationEvents: vi.fn() }))
vi.mock('../../hooks/useCreateApplicationEvent', () => ({ useCreateApplicationEvent: vi.fn() }))

const mutateAsync = vi.fn()

function renderTimeline() {
  return render(
    <AppProvider>
      <ApplicationTimeline applicationId="application-1" />
    </AppProvider>,
  )
}

describe('ApplicationTimeline', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCreateApplicationEvent).mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
    } as never)
  })

  it('shows an empty timeline state', () => {
    vi.mocked(useApplicationEvents).mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    } as never)

    renderTimeline()

    expect(screen.getByText('No timeline activity yet')).toBeInTheDocument()
  })

  it('renders manual and status events in API order', () => {
    vi.mocked(useApplicationEvents).mockReturnValue({
      data: [
        {
          id: 'event-2',
          applicationId: 'application-1',
          type: 'STATUS_CHANGE',
          description: 'Status changed from APPLIED to INTERVIEW',
          fromStatus: 'APPLIED',
          toStatus: 'INTERVIEW',
          occurredAt: '2026-08-07T15:30:00.000Z',
          createdAt: '2026-08-07T15:30:00.000Z',
        },
        {
          id: 'event-1',
          applicationId: 'application-1',
          type: 'NOTE',
          description: 'Sent a follow-up email.',
          fromStatus: null,
          toStatus: null,
          occurredAt: '2026-08-06T00:00:00.000Z',
          createdAt: '2026-08-06T12:00:00.000Z',
        },
      ],
      isPending: false,
      isError: false,
    } as never)

    renderTimeline()

    const descriptions = screen.getAllByText(/Status changed|Sent a follow-up/)
    expect(descriptions[0]).toHaveTextContent('Status changed from APPLIED to INTERVIEW')
    expect(descriptions[1]).toHaveTextContent('Sent a follow-up email.')
  })

  it('validates and submits a manual note', async () => {
    const user = userEvent.setup()
    mutateAsync.mockResolvedValue({ id: 'event-1' })
    vi.mocked(useApplicationEvents).mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    } as never)
    renderTimeline()

    await user.clear(screen.getByLabelText(/Occurrence date/))
    await user.type(screen.getByLabelText(/Occurrence date/), '2026-08-07')
    await user.type(screen.getByLabelText(/Note/), 'Followed up with the recruiter.')
    await user.click(screen.getByRole('button', { name: 'Add note' }))

    expect(mutateAsync).toHaveBeenCalledWith({
      applicationId: 'application-1',
      input: {
        type: 'NOTE',
        description: 'Followed up with the recruiter.',
        occurredAt: '2026-08-07T00:00:00.000Z',
      },
    })
  })
})
