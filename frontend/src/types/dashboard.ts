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
}
