import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { SignupPage } from './SignupPage'

vi.mock('../hooks/useSession', () => ({ useSession: () => ({ data: { user: null } }) }))
vi.mock('../hooks/useSignup', () => ({
  useSignup: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false }),
}))

describe('SignupPage', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('shows account fields, password guidance, and a sign-in link', () => {
    vi.stubEnv('VITE_ENABLE_PASSWORD_LOGIN', 'true')
    render(<AppProvider><MemoryRouter><SignupPage /></MemoryRouter></AppProvider>)

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })
})
