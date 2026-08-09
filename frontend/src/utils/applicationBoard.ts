import type { Application, ApplicationStatus } from '../types/application'

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  SAVED: 'Saved',
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  ASSESSMENT: 'Assessment',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
}

export function groupApplicationsByStatus(applications: Application[]) {
  const grouped: Record<ApplicationStatus, Application[]> = {
    SAVED: [],
    APPLIED: [],
    SCREENING: [],
    ASSESSMENT: [],
    INTERVIEW: [],
    OFFER: [],
    REJECTED: [],
    WITHDRAWN: [],
  }

  for (const application of applications) {
    grouped[application.status].push(application)
  }

  return grouped
}
