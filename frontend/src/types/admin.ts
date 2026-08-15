export interface AdminUserSummary {
  id: string
  username: string | null
  email: string
  name: string | null
  emailVerifiedAt: string | null
  createdAt: string
  authMethods: { password: boolean; google: boolean }
  applicationCount: number
  workspaceCount: number
}

export interface AdminUsersResponse {
  summary: {
    totalUsers: number
    verifiedUsers: number
    passwordUsers: number
    googleUsers: number
  }
  users: AdminUserSummary[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}
