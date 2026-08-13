export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
export interface WorkspaceMembership { role: WorkspaceRole; joinedAt: string; workspace: { id: string; name: string; isPersonal: boolean; createdAt: string; updatedAt: string; _count: { applications: number; members: number } } }
export interface WorkspaceMember { role: WorkspaceRole; joinedAt: string; user: { id: string; email: string; name: string | null; avatarUrl: string | null } }
export interface WorkspaceInvitation { id: string; emailNormalized: string; role: WorkspaceRole; expiresAt: string; createdAt: string; token?: string }
