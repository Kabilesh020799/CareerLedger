import type {
  GmailStatus,
  GmailSyncResult,
  GmailUpdateReview,
  ResolveGmailUpdateReviewInput,
  ResolveGmailUpdateReviewResult,
} from '../types/gmail'
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

  async listReviews() {
    const response = await api.get<GmailUpdateReview[]>('/gmail/reviews')
    return response.data
  },

  async resolveReview(id: string, input: ResolveGmailUpdateReviewInput) {
    const response = await api.patch<ResolveGmailUpdateReviewResult>(
      `/gmail/reviews/${id}`,
      input,
    )
    return response.data
  },

  async disconnect() {
    await api.delete('/gmail/connection')
  },
}
