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
