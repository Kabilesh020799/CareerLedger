import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../ui/AppProvider'
import { useCreateSuggestedFollowUp } from '../../hooks/useCreateSuggestedFollowUp'
import { useFollowUpSuggestions } from '../../hooks/useFollowUpSuggestions'
import { FollowUpSuggestions } from './FollowUpSuggestions'

vi.mock('../../hooks/useFollowUpSuggestions', () => ({ useFollowUpSuggestions: vi.fn() }))
vi.mock('../../hooks/useCreateSuggestedFollowUp', () => ({ useCreateSuggestedFollowUp: vi.fn() }))

const createMutation = {
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  variables: undefined,
}

function renderComponent() {
  return render(
    <AppProvider>
      <MemoryRouter>
        <FollowUpSuggestions />
      </MemoryRouter>
    </AppProvider>,
  )
}

describe('FollowUpSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCreateSuggestedFollowUp).mockReturnValue(createMutation as never)
  })
  afterEach(cleanup)

  it('shows eligible applications and creates a follow-up', async () => {
    const user = userEvent.setup()
    vi.mocked(useFollowUpSuggestions).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [{
        application: { id: 'application-1', company: 'Acme', jobTitle: 'Engineer' },
        lastActivityAt: '2026-07-30T10:00:00.000Z',
      }],
    } as never)

    renderComponent()

    const suggestion = screen.getByRole('article', { name: 'Follow up with Acme' })
    expect(suggestion).toHaveTextContent('Acme — Engineer')
    expect(screen.getByRole('link', { name: 'Acme — Engineer' })).toHaveAttribute(
      'href',
      '/applications/application-1',
    )
    await user.click(screen.getByRole('button', { name: 'Add follow-up' }))
    expect(createMutation.mutate).toHaveBeenCalledWith('application-1')
  })

  it('shows an empty suggestion state', () => {
    vi.mocked(useFollowUpSuggestions).mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: [],
    } as never)

    renderComponent()

    expect(screen.getByText('No follow-ups suggested')).toBeInTheDocument()
  })

  it('shows a retry action when suggestions fail', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()
    vi.mocked(useFollowUpSuggestions).mockReturnValue({
      isPending: false,
      isError: true,
      isSuccess: false,
      error: new Error('Suggestions unavailable'),
      refetch,
    } as never)

    renderComponent()

    expect(screen.getByText('Suggestions unavailable')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
