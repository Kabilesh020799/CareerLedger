import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { LoginPage } from './LoginPage'

vi.mock('../hooks/useSession', () => ({
  useSession: () => ({ data: { user: null } }),
}))

vi.mock('../hooks/usePasswordLogin', () => ({
  usePasswordLogin: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  }),
}))

describe('production HTTP login', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('offers password login and warns that credentials are not encrypted', () => {
    vi.stubEnv('VITE_ENABLE_PASSWORD_LOGIN', 'true')
    vi.stubEnv('VITE_ENABLE_GOOGLE_LOGIN', 'false')
    vi.stubEnv('VITE_INSECURE_HTTP_DEPLOYMENT', 'true')

    render(
      <AppProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AppProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Job Tracker' })).toBeInTheDocument()
    expect(screen.getByText('Insecure HTTP connection')).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Continue with Google' })).not.toBeInTheDocument()
  })
})
