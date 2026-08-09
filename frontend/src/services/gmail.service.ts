import type { GmailStatus, GmailSyncResult } from '../types/gmail'
import { api, apiBaseUrl } from './api'

export const gmailConnectUrl = `${apiBaseUrl.replace(/\/$/, '')}/gmail/connect`

export const gmailService = {
  async status() {
    const response = await api.get<GmailStatus>('/gmail/status')
    return response.data
  },

  async synchronize() {
    const response = await api.post<GmailSyncResult>('/gmail/sync')
    return response.data
  },

  async disconnect() {
    await api.delete('/gmail/connection')
  },
}
