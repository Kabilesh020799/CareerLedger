import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../ui/AppProvider'
import { ProtectedRoute } from './ProtectedRoute'

const sessionState = vi.hoisted(() => ({
  value: {
    isPending: false,
    isError: false,
    data: { user: null as { id: string } | null },
  },
}))

vi.mock('../../hooks/useSession', () => ({
  useSession: () => sessionState.value,
}))

function renderProtectedRoute() {
  return render(
    <AppProvider>
      <MemoryRouter initialEntries={['/applications']}>
        <Routes>
          <Route path="/login" element={<div>Sign in page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/applications" element={<div>Private applications</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AppProvider>,
  )
}

describe('protected application routes', () => {
  beforeEach(() => {
    sessionState.value = {
      isPending: false,
      isError: false,
      data: { user: null },
    }
  })

  it('redirects an unauthenticated visitor to sign in', () => {
    renderProtectedRoute()

    expect(screen.getByText('Sign in page')).toBeInTheDocument()
    expect(screen.queryByText('Private applications')).not.toBeInTheDocument()
  })

  it('renders protected content for an authenticated user', () => {
    sessionState.value = {
      isPending: false,
      isError: false,
      data: { user: { id: 'user-1' } },
    }

    renderProtectedRoute()

    expect(screen.getByText('Private applications')).toBeInTheDocument()
  })
})
