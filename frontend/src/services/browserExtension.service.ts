import { api } from './api'
import type { BrowserExtensionToken, CreatedBrowserExtensionToken } from '../types/browserExtension'

export const browserExtensionService = {
  async listTokens() {
    const response = await api.get<BrowserExtensionToken[]>('/browser-extension/tokens')
    return response.data
  },
  async createToken(name: string) {
    const response = await api.post<CreatedBrowserExtensionToken>('/browser-extension/tokens', { name })
    return response.data
  },
  async revokeToken(id: string) {
    await api.delete(`/browser-extension/tokens/${id}`)
  },
}
