export type ResumeVersion = {
  id: string
  name: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type UploadedResume = {
  id: string
  applicationId: string
  fileName: string
  mimeType: string
  size: number
  createdAt: string
  application: {
    company: string
    jobTitle: string
  }
}

export type CreateResumeVersionInput = {
  name: string
  notes?: string | null
}

export type UpdateResumeVersionInput = Partial<CreateResumeVersionInput>
