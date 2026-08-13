import { api } from './api'
import type { WorkspaceInvitation, WorkspaceMember, WorkspaceMembership, WorkspaceRole } from '../types/workspace'
export const workspaceService = {
  list: async () => (await api.get<WorkspaceMembership[]>('/workspaces')).data,
  create: async (name: string) => (await api.post('/workspaces', { name })).data,
  members: async (id: string) => (await api.get<WorkspaceMember[]>(`/workspaces/${id}/members`)).data,
  invitations: async (id: string) => (await api.get<WorkspaceInvitation[]>(`/workspaces/${id}/invitations`)).data,
  invite: async (id: string, data: { email: string; role: Exclude<WorkspaceRole, 'OWNER'> }) => (await api.post<WorkspaceInvitation>(`/workspaces/${id}/invitations`, data)).data,
  updateMember: async (id: string, userId: string, role: WorkspaceRole) => (await api.patch(`/workspaces/${id}/members/${userId}`, { role })).data,
  removeMember: async (id: string, userId: string) => { await api.delete(`/workspaces/${id}/members/${userId}`) },
  accept: async (token: string) => (await api.post('/workspaces/invitations/accept', { token })).data,
}
