import axios from 'axios'
import { api } from './api'
import type {
  Application,
  ApplicationEvent,
  ApplicationDiscoveryQuery,
  ApplicationDiscoveryResult,
  CreateApplicationEventInput,
  CreateApplicationInput,
  UpdateApplicationInput,
  ResumeUploadPreparation,
  ResumeDownloadPreparation,
} from '../types/application'

function applicationFormData(
  input: CreateApplicationInput | UpdateApplicationInput,
  resume: File,
) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(input)) {
    if (value !== null && value !== undefined) formData.append(key, String(value))
  }
  formData.append('resume', resume)
  return formData
}

async function prepareResumeUpload(resume: File) {
  const response = await api.post<ResumeUploadPreparation>(
    '/applications/resume-uploads',
    {
      fileName: resume.name,
      mimeType: resume.type,
      size: resume.size,
    },
  )
  return response.data
}

async function abandonResumeUpload(storageKey: string) {
  try {
    await api.delete('/applications/resume-uploads', { data: { storageKey } })
  } catch {
    // A bucket lifecycle rule is the final fallback for unfinished uploads.
  }
}

async function uploadResumeToS3(
  resume: File,
  preparation: Extract<ResumeUploadPreparation, { mode: 's3' }>,
) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(preparation.fields)) {
    formData.append(key, value)
  }
  formData.append('file', resume)

  await axios.post(preparation.url, formData, {
    withCredentials: false,
  })
}

async function createWithResume(input: CreateApplicationInput, resume: File) {
  const preparation = await prepareResumeUpload(resume)
  if (preparation.mode === 'database') {
    const response = await api.post<Application>(
      '/applications',
      applicationFormData(input, resume),
    )
    return response.data
  }

  try {
    await uploadResumeToS3(resume, preparation)
  } catch {
    await abandonResumeUpload(preparation.storageKey)
    throw new Error('Unable to upload resume. Please try again.')
  }

  try {
    const response = await api.post<Application>('/applications', {
      ...input,
      resumeUploadKey: preparation.storageKey,
    })
    return response.data
  } catch (error) {
    await abandonResumeUpload(preparation.storageKey)
    throw error
  }
}

async function updateWithResume(
  id: string,
  input: UpdateApplicationInput,
  resume: File,
) {
  const preparation = await prepareResumeUpload(resume)
  if (preparation.mode === 'database') {
    const response = await api.patch<Application>(
      `/applications/${id}`,
      applicationFormData(input, resume),
    )
    return response.data
  }

  try {
    await uploadResumeToS3(resume, preparation)
  } catch {
    await abandonResumeUpload(preparation.storageKey)
    throw new Error('Unable to upload resume. Please try again.')
  }

  try {
    const response = await api.patch<Application>(`/applications/${id}`, {
      ...input,
      resumeUploadKey: preparation.storageKey,
    })
    return response.data
  } catch (error) {
    await abandonResumeUpload(preparation.storageKey)
    throw error
  }
}

export const applicationService = {
  async list() {
    const response = await api.get<Application[]>('/applications')
    return response.data
  },

  async search(query: ApplicationDiscoveryQuery) {
    const response = await api.get<ApplicationDiscoveryResult>('/applications/search', {
      params: query,
    })
    return response.data
  },

  async getById(id: string) {
    const response = await api.get<Application>(`/applications/${id}`)
    return response.data
  },

  async create(input: CreateApplicationInput, resume?: File) {
    if (resume) return createWithResume(input, resume)
    const response = await api.post<Application>(
      '/applications',
      input,
    )
    return response.data
  },

  async update(id: string, input: UpdateApplicationInput, resume?: File) {
    if (resume) return updateWithResume(id, input, resume)
    const response = await api.patch<Application>(
      `/applications/${id}`,
      input,
    )
    return response.data
  },

  async remove(id: string) {
    await api.delete(`/applications/${id}`)
  },

  async downloadResume(id: string) {
    const preparation = await api.get<ResumeDownloadPreparation>(
      `/applications/${id}/resume-download`,
    )
    const response = preparation.data.mode === 's3'
      ? await axios.get<Blob>(preparation.data.url, {
          responseType: 'blob',
          withCredentials: false,
        })
      : await api.get<Blob>(`/applications/${id}/resume`, {
          responseType: 'blob',
        })
    return response.data
  },

  async listEvents(id: string) {
    const response = await api.get<ApplicationEvent[]>(`/applications/${id}/events`)
    return response.data
  },

  async createEvent(id: string, input: CreateApplicationEventInput) {
    const response = await api.post<ApplicationEvent>(`/applications/${id}/events`, input)
    return response.data
  },
}
