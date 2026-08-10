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
  resumeVersionId?: string | null
  resumeVersion?: {
    id: string
    name: string
    notes: string | null
  } | null
  resumeAttachment?: {
    fileName: string
    mimeType: string
    size: number
    createdAt: string
  } | null
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
  resumeVersionId?: string | null
}

export type UpdateApplicationInput = Partial<CreateApplicationInput>

export type CreateApplicationRequest = {
  input: CreateApplicationInput
  resume?: File
}

export const applicationSortFields = [
  'appliedAt',
  'createdAt',
  'updatedAt',
  'company',
] as const

export type ApplicationSortField = (typeof applicationSortFields)[number]
export type ApplicationSortOrder = 'asc' | 'desc'

export type ApplicationDiscoveryQuery = {
  search?: string
  status?: ApplicationStatus
  source?: string
  appliedFrom?: string
  appliedTo?: string
  sortBy: ApplicationSortField
  sortOrder: ApplicationSortOrder
  page: number
  limit: number
}

export type ApplicationPagination = {
  page: number
  limit: number
  total: number
  pages: number
}

export type ApplicationDiscoveryResult = {
  data: Application[]
  pagination: ApplicationPagination
}

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
