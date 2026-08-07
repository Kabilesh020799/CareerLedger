import { api } from './api'
import type {
  Application,
  CreateApplicationInput,
  UpdateApplicationInput,
} from '../types/application'

export const applicationService = {
  async list() {
    const response = await api.get<Application[]>('/applications')
    return response.data
  },

  async getById(id: string) {
    const response = await api.get<Application>(`/applications/${id}`)
    return response.data
  },

  async create(input: CreateApplicationInput) {
    const response = await api.post<Application>('/applications', input)
    return response.data
  },

  async update(id: string, input: UpdateApplicationInput) {
    const response = await api.patch<Application>(`/applications/${id}`, input)
    return response.data
  },

  async remove(id: string) {
    await api.delete(`/applications/${id}`)
  },
}
