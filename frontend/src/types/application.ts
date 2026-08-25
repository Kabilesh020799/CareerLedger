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

export type SprintStatus = 'ACTIVE' | 'CLOSED'

export type Sprint = {
  id: string
  userId: string
  workspaceId: string | null
  name: string
  sequence: number
  status: SprintStatus
  startedAt: string
  closedAt: string | null
  applicationCount?: number
  rejectedCount?: number
  createdAt: string
  updatedAt: string
}

/** Work arrangement extracted from a captured job posting. */
export type WorkMode = 'REMOTE' | 'HYBRID' | 'ONSITE'

export type Application = {
  id: string
  company: string
  jobTitle: string
  location: string | null
  jobUrl: string | null
  source: string | null
  status: ApplicationStatus
  notes: string | null
  jobDescription?: string | null
  skills?: string[]
  experienceRequirements?: string | null
  salaryMin?: number | null
  salaryMax?: number | null
  salaryCurrency?: string | null
  salaryPeriod?: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | null
  workMode?: WorkMode | null
  capturedAt?: string | null
  appliedAt: string | null
  resumeVersionId?: string | null
  resumeVersion?: {
    id: string
    name: string
    notes: string | null
  } | null
  resumeAttachment?: ApplicationAttachment | null
  coverLetterAttachment?: ApplicationAttachment | null
  sprint?: Pick<Sprint, 'id' | 'name' | 'sequence' | 'status'> | null
  createdAt: string
  updatedAt: string
}

/** Public metadata for a private application document; file bytes and storage keys are excluded. */
export type ApplicationAttachment = {
  fileName: string
  mimeType: string
  size: number
  createdAt: string
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

export type ResumeUploadPreparation =
  | { mode: 'database' }
  | {
      mode: 's3'
      storageKey: string
      url: string
      fields: Record<string, string>
      expiresAt: string
    }

export type ResumeDownloadPreparation =
  | { mode: 'database'; url: null }
  | { mode: 's3'; url: string }

export type UpdateApplicationInput = Partial<CreateApplicationInput>

/** Optional private documents selected while creating or updating an application. */
export type ApplicationAttachments = {
  resume?: File
  coverLetter?: File
}

export type CreateApplicationRequest = {
  input: CreateApplicationInput
  resume?: File
  coverLetter?: File
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

export type CurrentSprint = {
  sprint: Sprint | null
  applications: Application[]
}

export type StartSprintInput = {
  name?: string
}

export type SprintStartResult = {
  sprint: Sprint
  previousSprint: Sprint | null
  carriedOverCount: number
  closedRejectedCount: number
}

/** Backend name for the metadata returned for an active or closed sprint. */
export type SprintSummary = Sprint

/** Backend response for the current sprint board. */
export type CurrentSprintResponse = CurrentSprint

/** Backend response for starting a sprint. */
export type StartSprintResponse = SprintStartResult

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
