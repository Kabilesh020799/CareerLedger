import type {
  GmailStatus,
  GmailSyncResult,
  GmailUpdateReview,
  ResolveGmailUpdateReviewInput,
  ResolveGmailUpdateReviewResult,
  UpdateGmailScheduleInput,
} from '../types/gmail'
import { api, apiBaseUrl } from './api'
import {
  abandonResumeUpload,
  applicationFormData,
  prepareResumeUpload,
  uploadResumeToS3,
} from './application.service'

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

  async updateSchedule(input: UpdateGmailScheduleInput) {
    const response = await api.patch<GmailStatus>('/gmail/schedule', input)
    return response.data
  },

  async listReviews() {
    const response = await api.get<GmailUpdateReview[]>('/gmail/reviews')
    return response.data
  },

  async resolveReview(id: string, input: ResolveGmailUpdateReviewInput, resume?: File) {
    if (resume && input.action === 'CREATE_APPLICATION') {
      const preparation = await prepareResumeUpload(resume)
      if (preparation.mode === 'database') {
        const response = await api.patch<ResolveGmailUpdateReviewResult>(
          `/gmail/reviews/${id}`,
          applicationFormData(input, resume),
        )
        return response.data
      }

      try {
        await uploadResumeToS3(resume, preparation)
      } catch {
        await abandonResumeUpload(preparation.storageKey)
        throw new Error('Unable to upload resume. Please try again.')
      }

      try {
        const response = await api.patch<ResolveGmailUpdateReviewResult>(
          `/gmail/reviews/${id}`,
          { ...input, resumeUploadKey: preparation.storageKey },
        )
        return response.data
      } catch (error) {
        await abandonResumeUpload(preparation.storageKey)
        throw error
      }
    }
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
