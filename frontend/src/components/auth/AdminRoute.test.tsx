import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminRoute } from './AdminRoute'

const session = vi.hoisted(() => ({ isAdmin: false }))
vi.mock('../../hooks/useSession', () => ({
  useSession: () => ({ data: { user: { isAdmin: session.isAdmin } } }),
}))

describe('AdminRoute', () => {
  beforeEach(() => { session.isAdmin = false })

  function renderRoute() {
    render(<MemoryRouter initialEntries={['/admin/users']}><Routes><Route element={<AdminRoute />}><Route path="admin/users" element={<div>Admin users</div>} /></Route><Route path="applications" element={<div>Applications</div>} /></Routes></MemoryRouter>)
  }

  it('shows the page to an administrator', () => {
    session.isAdmin = true
    renderRoute()
    expect(screen.getByText('Admin users')).toBeInTheDocument()
  })

  it('redirects a regular account', () => {
    renderRoute()
    expect(screen.getByText('Applications')).toBeInTheDocument()
  })
})
