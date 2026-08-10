import { Button } from '@chakra-ui/react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { AppProvider } from './AppProvider'
import { useFeedback } from './feedback-context'

function FeedbackTrigger() {
  const feedback = useFeedback()
  return <Button onClick={() => feedback.show('Application updated', { description: 'Engineer at Acme' })}>Show feedback</Button>
}

describe('FeedbackProvider', () => {
  afterEach(cleanup)

  it('announces and dismisses action feedback', async () => {
    const user = userEvent.setup()
    render(<AppProvider><FeedbackTrigger /></AppProvider>)

    await user.click(screen.getByRole('button', { name: 'Show feedback' }))
    expect(screen.getByText('Application updated')).toBeInTheDocument()
    expect(screen.getByText('Engineer at Acme')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }))
    expect(screen.queryByText('Application updated')).not.toBeInTheDocument()
  })
})
