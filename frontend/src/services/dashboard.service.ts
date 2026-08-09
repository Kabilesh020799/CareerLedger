import type { DashboardSummary } from '../types/dashboard'
import { api } from './api'

export const dashboardService = {
  async getSummary() {
    const response = await api.get<DashboardSummary>('/dashboard/summary')
    return response.data
  },
}
