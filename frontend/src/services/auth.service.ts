import type { AuthSession } from '../types/auth'
import type { LoginInput } from '../schemas/login.schema'
import type { SignupRequest } from '../schemas/signup.schema'
import { api, apiBaseUrl } from './api'

export const googleLoginUrl = `${apiBaseUrl.replace(/\/$/, '')}/auth/google`

export const authService = {
  async session() {
    const response = await api.get<AuthSession>('/auth/session')
    return response.data
  },

  async logout() {
    await api.post('/auth/logout')
  },

  async login(input: LoginInput) {
    const response = await api.post<AuthSession>('/auth/login', input)
    return response.data
  },

  async signup(input: SignupRequest) {
    const response = await api.post<AuthSession>('/auth/signup', input)
    return response.data
  },
}
