import type { DeleteAccountInput, ProfileInput } from '../schemas/account.schema'
import type { AccountProfile } from '../types/account'
import { api } from './api'

/** Account recovery and self-service profile API. */
export const accountService = {
  async forgotPassword(email: string) { await api.post('/auth/forgot-password', { email }) },
  async resetPassword(token: string, password: string) { await api.post('/auth/reset-password', { token, password }) },
  async verifyEmail(token: string) { await api.post('/auth/verify-email', { token }) },
  async resendVerification(email: string) { await api.post('/auth/resend-verification', { email }) },
  async profile() { return (await api.get<AccountProfile>('/account')).data },
  async updateProfile(input: ProfileInput) { return (await api.patch<AccountProfile>('/account', input)).data },
  async deleteAccount(input: DeleteAccountInput) { await api.delete('/account', { data: input }) },
}
