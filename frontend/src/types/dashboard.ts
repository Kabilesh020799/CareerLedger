import type { ApplicationStatus } from './application'

export type DashboardSummary = {
  totalApplications: number
  createdThisWeek: number
  weekStartedAt: string
  submittedApplications: number
  statusCounts: Record<ApplicationStatus, number>
  conversionRates: {
    screening: number
    interview: number
    offer: number
  }
  resumeOutcomes: ResumeOutcome[]
  sourceOutcomes: SourceOutcome[]
}

export type ResumeOutcome = {
  resumeVersionId: string
  name: string
  submittedApplications: number
  milestoneCounts: {
    screening: number
    interview: number
    offer: number
  }
  conversionRates: {
    screening: number | null
    interview: number | null
    offer: number | null
  }
}

export type SourceOutcome = {
  source: string
  submittedApplications: number
  outcomeCounts: {
    response: number
    interview: number
    offer: number
  }
  outcomeRates: {
    response: number | null
    interview: number | null
    offer: number | null
  }
}
