/** Profile and authentication-method details returned by the account API. */
export interface AccountProfile {
  id: string
  username: string | null
  email: string
  name: string | null
  avatarUrl: string | null
  emailVerified: boolean
  emailDeliveryAvailable: boolean
  authMethods: { password: boolean; google: boolean }
}
