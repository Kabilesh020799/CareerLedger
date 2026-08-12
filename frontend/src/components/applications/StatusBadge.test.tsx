import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppProvider } from '../ui/AppProvider'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders the applied status as a compact title-case badge', () => {
    render(<AppProvider><StatusBadge status="APPLIED" /></AppProvider>)

    const badge = screen.getByText('Applied')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('chakra-badge')
  })
})
