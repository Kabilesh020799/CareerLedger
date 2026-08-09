import { api } from './api'
import type {
  CreateResumeVersionInput,
  ResumeVersion,
  UpdateResumeVersionInput,
} from '../types/resume'

export const resumeVersionService = {
  async list() {
    const response = await api.get<ResumeVersion[]>('/resumes')
    return response.data
  },

  async create(input: CreateResumeVersionInput) {
    const response = await api.post<ResumeVersion>('/resumes', input)
    return response.data
  },

  async update(id: string, input: UpdateResumeVersionInput) {
    const response = await api.patch<ResumeVersion>(`/resumes/${id}`, input)
    return response.data
  },

  async remove(id: string) {
    await api.delete(`/resumes/${id}`)
  },
}
