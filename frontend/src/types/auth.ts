export interface AuthenticatedUser {
  id: string
  username: string | null
  email: string
  name: string | null
  avatarUrl: string | null
  emailVerifiedAt: string | null
}

export interface AuthSession {
  user: AuthenticatedUser | null
}
