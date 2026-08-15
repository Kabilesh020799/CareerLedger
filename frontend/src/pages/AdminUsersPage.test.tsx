import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { AdminUsersPage } from './AdminUsersPage'

vi.mock('../hooks/useAdminUsers', () => ({ useAdminUsers: vi.fn() }))

describe('AdminUsersPage', () => {
  it('shows account totals and non-sensitive user details', () => {
    vi.mocked(useAdminUsers).mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        summary: { totalUsers: 2, verifiedUsers: 1, passwordUsers: 2, googleUsers: 1 },
        users: [{ id: 'user-1', username: 'alex', email: 'alex@example.com', name: 'Alex', emailVerifiedAt: null, createdAt: '2026-08-01T00:00:00.000Z', authMethods: { password: true, google: false }, applicationCount: 4, workspaceCount: 1 }],
        pagination: { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
      },
    } as never)

    render(<AppProvider><MemoryRouter><AdminUsersPage /></MemoryRouter></AppProvider>)
    expect(screen.getByText('User accounts')).toBeInTheDocument()
    expect(screen.getByText('alex@example.com')).toBeInTheDocument()
    expect(screen.getByText('Unverified')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })
})
