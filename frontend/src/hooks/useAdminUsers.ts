import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { adminService } from '../services/admin.service'

export function useAdminUsers(page: number, search: string) {
  return useQuery({
    queryKey: ['admin', 'users', { page, search }],
    queryFn: () => adminService.listUsers(page, search),
    placeholderData: keepPreviousData,
  })
}
