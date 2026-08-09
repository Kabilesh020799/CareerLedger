import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AppProvider } from '../ui/AppProvider'
import { SourceOutcomeAnalytics } from './SourceOutcomeAnalytics'

function renderAnalytics(outcomes: Parameters<typeof SourceOutcomeAnalytics>[0]['outcomes']) {
  return render(
    <AppProvider>
      <MemoryRouter><SourceOutcomeAnalytics outcomes={outcomes} /></MemoryRouter>
    </AppProvider>,
  )
}

describe('SourceOutcomeAnalytics', () => {
  afterEach(cleanup)

  it('compares outcome counts and rates across application sources', () => {
    renderAnalytics([
      {
        source: 'LinkedIn',
        submittedApplications: 7,
        outcomeCounts: { response: 5, interview: 2, offer: 1 },
        outcomeRates: { response: 71.4, interview: 28.6, offer: 14.3 },
      },
    ])

    const row = screen.getByRole('row', { name: 'Outcomes for LinkedIn' })
    expect(screen.getByText(/Response includes screening/)).toBeInTheDocument()
    expect(within(row).getByText('7')).toBeInTheDocument()
    expect(within(row).getByText('71.4%')).toBeInTheDocument()
    expect(within(row).getByText('5 applications')).toBeInTheDocument()
    expect(within(row).getByText('28.6%')).toBeInTheDocument()
    expect(within(row).getByText('14.3%')).toBeInTheDocument()
  })

  it('marks rates unavailable without submitted applications', () => {
    renderAnalytics([
      {
        source: 'Referral',
        submittedApplications: 0,
        outcomeCounts: { response: 0, interview: 0, offer: 0 },
        outcomeRates: { response: null, interview: null, offer: null },
      },
    ])

    const row = screen.getByRole('row', { name: 'Outcomes for Referral' })
    expect(within(row).getByText('No submitted applications')).toBeInTheDocument()
    expect(within(row).getAllByLabelText('Rate unavailable')).toHaveLength(3)
  })

  it('links to application creation when no source data exists', () => {
    renderAnalytics([])

    expect(screen.getByRole('heading', { name: 'No source outcome data yet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create an application' })).toHaveAttribute('href', '/applications/new')
  })
})
