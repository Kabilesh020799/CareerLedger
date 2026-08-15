import type { AdminUsersResponse } from '../types/admin'
import { api } from './api'

export const adminService = {
  async listUsers(page: number, search: string) {
    const response = await api.get<AdminUsersResponse>('/admin/users', {
      params: { page, pageSize: 25, search: search || undefined },
    })
    return response.data
  },
}
