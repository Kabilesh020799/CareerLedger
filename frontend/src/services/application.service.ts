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
  ApplicationAttachments,
  CurrentSprint,
  Sprint,
  SprintStartResult,
  StartSprintInput,
} from '../types/application'

/** Converts application fields and a resume into a legacy multipart request. */
export function applicationFormData(
  input: Record<string, unknown>,
  resume?: File,
  coverLetter?: File,
) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(input)) {
    if (value !== null && value !== undefined) formData.append(key, String(value))
  }
  if (resume) formData.append('resume', resume)
  if (coverLetter) formData.append('coverLetter', coverLetter)
  return formData
}

export async function prepareCoverLetterUpload(coverLetter: File) {
  const response = await api.post<ResumeUploadPreparation>(
    '/applications/cover-letter-uploads',
    { fileName: coverLetter.name, mimeType: coverLetter.type, size: coverLetter.size },
  )
  return response.data
}

export async function abandonCoverLetterUpload(storageKey: string) {
  try {
    await api.delete('/applications/cover-letter-uploads', { data: { storageKey } })
  } catch {
    // A bucket lifecycle rule is the final fallback for unfinished uploads.
  }
}

/** Requests direct-upload permission or selects database fallback storage. */
export async function prepareResumeUpload(resume: File) {
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

export async function abandonResumeUpload(storageKey: string) {
  try {
    await api.delete('/applications/resume-uploads', { data: { storageKey } })
  } catch {
    // A bucket lifecycle rule is the final fallback for unfinished uploads.
  }
}

export async function uploadResumeToS3(
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

export async function uploadCoverLetterToS3(
  coverLetter: File,
  preparation: Extract<ResumeUploadPreparation, { mode: 's3' }>,
) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(preparation.fields)) formData.append(key, value)
  formData.append('file', coverLetter)
  await axios.post(preparation.url, formData, { withCredentials: false })
}

type PreparedAttachment = {
  kind: 'resume' | 'coverLetter'
  file: File
  preparation: ResumeUploadPreparation
}

function normalizeAttachments(value?: File | ApplicationAttachments): ApplicationAttachments {
  return value instanceof File ? { resume: value } : value ?? {}
}

async function saveWithAttachments(
  method: 'post' | 'patch',
  url: string,
  input: CreateApplicationInput | UpdateApplicationInput,
  attachments: ApplicationAttachments,
) {
  const prepared: PreparedAttachment[] = []
  const cleanup = () => Promise.all(prepared.flatMap(({ kind, preparation }) => preparation.mode === 's3'
    ? [kind === 'resume' ? abandonResumeUpload(preparation.storageKey) : abandonCoverLetterUpload(preparation.storageKey)]
    : []))

  try {
    if (attachments.resume) prepared.push({ kind: 'resume', file: attachments.resume, preparation: await prepareResumeUpload(attachments.resume) })
    if (attachments.coverLetter) prepared.push({ kind: 'coverLetter', file: attachments.coverLetter, preparation: await prepareCoverLetterUpload(attachments.coverLetter) })
  } catch (error) {
    await cleanup()
    throw error
  }

  try {
    for (const attachment of prepared) {
      if (attachment.preparation.mode !== 's3') continue
      if (attachment.kind === 'resume') await uploadResumeToS3(attachment.file, attachment.preparation)
      else await uploadCoverLetterToS3(attachment.file, attachment.preparation)
    }
  } catch {
    await cleanup()
    throw new Error('Unable to upload application documents. Please try again.')
  }

  const payload: Record<string, unknown> = { ...input }
  const resumePreparation = prepared.find(({ kind }) => kind === 'resume')?.preparation
  const coverLetterPreparation = prepared.find(({ kind }) => kind === 'coverLetter')?.preparation
  if (resumePreparation?.mode === 's3') payload.resumeUploadKey = resumePreparation.storageKey
  if (coverLetterPreparation?.mode === 's3') payload.coverLetterUploadKey = coverLetterPreparation.storageKey

  const hasDatabaseAttachment = prepared.some(({ preparation }) => preparation.mode === 'database')
  const body = hasDatabaseAttachment
    ? applicationFormData(
        payload,
        resumePreparation?.mode === 'database' ? attachments.resume : undefined,
        coverLetterPreparation?.mode === 'database' ? attachments.coverLetter : undefined,
      )
    : payload

  try {
    const response = method === 'post'
      ? await api.post<Application>(url, body)
      : await api.patch<Application>(url, body)
    return response.data
  } catch (error) {
    await cleanup()
    throw error
  }
}

/** Application API operations used by the frontend query and mutation hooks. */
export const applicationService = {
  async list() {
    const firstPage = await applicationService.search({
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      limit: 50,
    })
    if (firstPage.pagination.pages <= 1) return firstPage.data

    const applications = [...firstPage.data]
    for (let page = 2; page <= firstPage.pagination.pages; page += 1) {
      const result = await applicationService.search({
        sortBy: 'createdAt',
        sortOrder: 'desc',
        page,
        limit: 50,
      })
      applications.push(...result.data)
    }
    return applications
  },

  async search(query: ApplicationDiscoveryQuery) {
    const response = await api.get<ApplicationDiscoveryResult>('/applications/search', {
      params: query,
    })
    return response.data
  },

  async getCurrentSprint() {
    const response = await api.get<CurrentSprint>('/sprints/current')
    return response.data
  },

  async listSprints() {
    const response = await api.get<Sprint[]>('/sprints')
    return response.data
  },

  async startSprint(input: StartSprintInput = {}) {
    const response = await api.post<SprintStartResult>('/sprints/start', input)
    return response.data
  },

  async getById(id: string) {
    const response = await api.get<Application>(`/applications/${id}`)
    return response.data
  },

  async create(input: CreateApplicationInput, attachmentsOrResume?: File | ApplicationAttachments) {
    const attachments = normalizeAttachments(attachmentsOrResume)
    if (attachments.resume || attachments.coverLetter) return saveWithAttachments('post', '/applications', input, attachments)
    const response = await api.post<Application>(
      '/applications',
      input,
    )
    return response.data
  },

  async update(id: string, input: UpdateApplicationInput, attachmentsOrResume?: File | ApplicationAttachments) {
    const attachments = normalizeAttachments(attachmentsOrResume)
    if (attachments.resume || attachments.coverLetter) return saveWithAttachments('patch', `/applications/${id}`, input, attachments)
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

  async downloadCoverLetter(id: string) {
    const preparation = await api.get<ResumeDownloadPreparation>(
      `/applications/${id}/cover-letter-download`,
    )
    const response = preparation.data.mode === 's3'
      ? await axios.get<Blob>(preparation.data.url, { responseType: 'blob', withCredentials: false })
      : await api.get<Blob>(`/applications/${id}/cover-letter`, { responseType: 'blob' })
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
