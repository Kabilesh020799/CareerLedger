import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { useAccountProfile, useDeleteAccount, useResendEmailVerification, useUpdateProfile } from '../hooks/accountHooks'
import { ProfilePage } from './ProfilePage'

vi.mock('../hooks/accountHooks', () => ({
  useAccountProfile: vi.fn(), useUpdateProfile: vi.fn(), useDeleteAccount: vi.fn(), useResendEmailVerification: vi.fn(),
}))

describe('ProfilePage', () => {
  const updateMutate = vi.fn()
  const deleteMutate = vi.fn()
  const resendMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAccountProfile).mockReturnValue({ isPending: false, isError: false, data: { id: 'user-1', username: 'person', email: 'person@example.com', name: 'Person Name', avatarUrl: null, emailVerified: false, emailDeliveryAvailable: true, authMethods: { password: true, google: false } } } as never)
    vi.mocked(useUpdateProfile).mockReturnValue({ mutate: updateMutate, isPending: false, isError: false, isSuccess: false } as never)
    vi.mocked(useDeleteAccount).mockReturnValue({ mutate: deleteMutate, isPending: false, isError: false } as never)
    vi.mocked(useResendEmailVerification).mockReturnValue({ mutate: resendMutate, isPending: false, isSuccess: false } as never)
  })
  afterEach(cleanup)

  it('updates the display name and offers email verification', async () => {
    const user = userEvent.setup()
    render(<AppProvider><MemoryRouter><ProfilePage /></MemoryRouter></AppProvider>)
    expect(screen.getByText('Email not verified')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Resend verification' }))
    expect(resendMutate).toHaveBeenCalledWith('person@example.com')
    const name = screen.getByLabelText('Display name')
    await user.clear(name); await user.type(name, 'Updated Person')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(updateMutate).toHaveBeenCalledWith({ name: 'Updated Person' })
  })

  it('requires account confirmation before deletion', async () => {
    const user = userEvent.setup()
    render(<AppProvider><MemoryRouter><ProfilePage /></MemoryRouter></AppProvider>)
    await user.type(screen.getByLabelText('Type your email to confirm'), 'person@example.com')
    await user.type(screen.getByLabelText('Current password'), 'CurrentPassword1')
    await user.click(screen.getByRole('button', { name: 'Permanently delete account' }))
    expect(deleteMutate).toHaveBeenCalledWith({ email: 'person@example.com', password: 'CurrentPassword1' }, expect.objectContaining({ onSuccess: expect.any(Function) }))
  })
})
