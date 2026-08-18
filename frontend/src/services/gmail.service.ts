import type {
  GmailStatus,
  GmailSyncJobStatus,
  GmailSyncStart,
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

const gmailSyncPollIntervalMs = 1_500
const gmailSyncPollLimit = 240

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

/**
 * Polls a background Gmail job using short HTTP requests so reverse proxies do
 * not need to keep one request open while Gmail and optional AI analysis run.
 */
async function awaitSynchronization(jobId: string) {
  for (let attempt = 0; attempt < gmailSyncPollLimit; attempt += 1) {
    const response = await api.get<GmailSyncJobStatus>(`/gmail/sync/${jobId}`)
    const job = response.data

    if (job.status === 'completed') {
      if (!job.result) throw new Error('Gmail synchronization completed without a result.')
      return job.result
    }

    if (job.status === 'failed') {
      throw new Error(job.error || 'Gmail could not be synchronized. Try again.')
    }

    await wait(gmailSyncPollIntervalMs)
  }

  throw new Error('Gmail synchronization is still running. Please check again shortly.')
}

export const gmailService = {
  async status() {
    const response = await api.get<GmailStatus>('/gmail/status')
    return response.data
  },

  async synchronize() {
    const response = await api.post<GmailSyncStart>('/gmail/sync')
    return awaitSynchronization(response.data.jobId)
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
