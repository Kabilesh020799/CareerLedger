import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../services/dashboard.service'
import { dashboardQueryKeys } from './dashboardQueryKeys'

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardQueryKeys.summary,
    queryFn: () => dashboardService.getSummary(),
  })
}
