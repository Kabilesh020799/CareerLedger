import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AppProvider } from '../ui/AppProvider'
import { ResumeOutcomeAnalytics } from './ResumeOutcomeAnalytics'

function renderAnalytics(outcomes: Parameters<typeof ResumeOutcomeAnalytics>[0]['outcomes']) {
  return render(
    <AppProvider>
      <MemoryRouter><ResumeOutcomeAnalytics outcomes={outcomes} /></MemoryRouter>
    </AppProvider>,
  )
}

describe('ResumeOutcomeAnalytics', () => {
  afterEach(cleanup)

  it('compares milestone counts and rates across resume versions', () => {
    renderAnalytics([
      {
        resumeVersionId: 'resume-1',
        name: 'Full-stack resume',
        submittedApplications: 7,
        milestoneCounts: { screening: 4, interview: 2, offer: 1 },
        conversionRates: { screening: 57.1, interview: 28.6, offer: 14.3 },
      },
    ])

    const row = screen.getByRole('row', { name: 'Outcomes for Full-stack resume' })
    expect(within(row).getByText('7')).toBeInTheDocument()
    expect(within(row).getByText('57.1%')).toBeInTheDocument()
    expect(within(row).getByText('4 applications')).toBeInTheDocument()
    expect(within(row).getByText('28.6%')).toBeInTheDocument()
    expect(within(row).getByText('14.3%')).toBeInTheDocument()
  })

  it('marks rates unavailable without submitted applications', () => {
    renderAnalytics([
      {
        resumeVersionId: 'resume-1',
        name: 'Saved resume',
        submittedApplications: 0,
        milestoneCounts: { screening: 0, interview: 0, offer: 0 },
        conversionRates: { screening: null, interview: null, offer: null },
      },
    ])

    const row = screen.getByRole('row', { name: 'Outcomes for Saved resume' })
    expect(within(row).getByText('No submitted applications')).toBeInTheDocument()
    expect(within(row).getAllByLabelText('Rate unavailable')).toHaveLength(3)
  })

  it('links to resume management when no versions exist', () => {
    renderAnalytics([])

    expect(screen.getByRole('heading', { name: 'No resume outcome data yet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Manage resume versions' })).toHaveAttribute('href', '/resumes')
  })
})
