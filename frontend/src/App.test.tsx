import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { AppProvider } from './components/ui/AppProvider'

vi.mock('./hooks/useApplications', () => ({
  useApplications: () => ({ isPending: false, isError: false, isSuccess: true, data: [] }),
}))

function renderApp(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <AppProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    </AppProvider>,
  )
}

describe('application routing', () => {
  it('shows primary navigation and navigates to applications', async () => {
    const user = userEvent.setup()
    renderApp('/dashboard')

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Applications' }))
    expect(screen.getByRole('heading', { name: 'Applications' })).toBeInTheDocument()
  })

  it('shows a recovery link for an unknown route', () => {
    renderApp('/unknown')

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to applications' })).toHaveAttribute('href', '/applications')
  })
})
