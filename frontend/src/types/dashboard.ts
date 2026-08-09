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
