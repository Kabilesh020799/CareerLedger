export const applicationStatuses = [
  'SAVED',
  'APPLIED',
  'SCREENING',
  'ASSESSMENT',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
] as const

export type ApplicationStatus = (typeof applicationStatuses)[number]

export type Application = {
  id: string
  company: string
  jobTitle: string
  location: string | null
  jobUrl: string | null
  source: string | null
  status: ApplicationStatus
  notes: string | null
  appliedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CreateApplicationInput = {
  company: string
  jobTitle: string
  location?: string | null
  jobUrl?: string | null
  source?: string | null
  status?: ApplicationStatus
  notes?: string | null
  appliedAt?: string | null
}

export type UpdateApplicationInput = Partial<CreateApplicationInput>

export const applicationEventTypes = ['NOTE', 'STATUS_CHANGE'] as const

export type ApplicationEventType = (typeof applicationEventTypes)[number]

export type ApplicationEvent = {
  id: string
  applicationId: string
  type: ApplicationEventType
  description: string
  fromStatus: ApplicationStatus | null
  toStatus: ApplicationStatus | null
  occurredAt: string
  createdAt: string
}

export type CreateApplicationEventInput = {
  type: 'NOTE'
  description: string
  occurredAt: string
}
