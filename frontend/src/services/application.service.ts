import { api } from './api'
import type {
  Application,
  ApplicationEvent,
  ApplicationDiscoveryQuery,
  ApplicationDiscoveryResult,
  CreateApplicationEventInput,
  CreateApplicationInput,
  UpdateApplicationInput,
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
    const response = await api.post<Application>(
      '/applications',
      resume ? applicationFormData(input, resume) : input,
    )
    return response.data
  },

  async update(id: string, input: UpdateApplicationInput, resume?: File) {
    const response = await api.patch<Application>(
      `/applications/${id}`,
      resume ? applicationFormData(input, resume) : input,
    )
    return response.data
  },

  async remove(id: string) {
    await api.delete(`/applications/${id}`)
  },

  async downloadResume(id: string) {
    const response = await api.get<Blob>(`/applications/${id}/resume`, {
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
