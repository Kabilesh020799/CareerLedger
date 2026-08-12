export type GmailStatus = {
  configured: boolean
  connected: boolean
  gmailEmail: string | null
  lastSyncedAt: string | null
  synchronizedMessages: number
  automaticSync: {
    enabled: boolean
    intervalMinutes: GmailSyncInterval
    lastAttemptAt: string | null
    lastError: string | null
  }
}

export type GmailSyncInterval = 15 | 30 | 60 | 180 | 360 | 720 | 1440

export type UpdateGmailScheduleInput = {
  enabled: boolean
  intervalMinutes: GmailSyncInterval
}

export type GmailSyncResult = {
  synchronizationType: 'full' | 'incremental'
  fetchedMessages: number
  newMessages: number
  duplicateMessages: number
  analyzedMessages: number
  detectedUpdates: number
  lastSyncedAt: string
}

export type GmailUpdateReview = {
  id: string
  suggestedStatus: import('./application').ApplicationStatus
  suggestedCompany: string | null
  suggestedJobTitle: string | null
  subject: string
  sender: string
  receivedAt: string | null
  matchConfidence: number
  status: 'PENDING' | 'CONFIRMED' | 'IGNORED'
  createdAt: string
  application: {
    id: string
    company: string
    jobTitle: string
    status: import('./application').ApplicationStatus
  } | null
}

export type ResolveGmailUpdateReviewInput =
  | { action: 'IGNORE' }
  | {
      action: 'CONFIRM'
      applicationId: string
      status: import('./application').ApplicationStatus
    }
  | {
      action: 'CREATE_APPLICATION'
      company: string
      jobTitle: string
      status: import('./application').ApplicationStatus
      resumeVersionId?: string | null
      resumeUploadKey?: string
    }

export type ResolveGmailUpdateReviewResult = {
  review: GmailUpdateReview
  application: import('./application').Application | null
}
