import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppProvider } from '../ui/AppProvider'
import { applicationStatusPalettes } from '../ui/palette'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders the applied status as a compact title-case badge', () => {
    render(<AppProvider><StatusBadge status="APPLIED" /></AppProvider>)

    const badge = screen.getByText('Applied')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('chakra-badge')
  })

  it('keeps every workflow status visually distinct from the primary action palette', () => {
    expect(applicationStatusPalettes).toEqual({
      SAVED: 'gray',
      APPLIED: 'blue',
      SCREENING: 'cyan',
      ASSESSMENT: 'purple',
      INTERVIEW: 'orange',
      OFFER: 'green',
      REJECTED: 'red',
      WITHDRAWN: 'gray',
    })
    expect(Object.values(applicationStatusPalettes)).not.toContain('brand')
  })
})
