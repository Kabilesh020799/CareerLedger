import axios from 'axios'

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ error?: string; requestId?: string }>(error)) {
    const message = error.response?.data?.error || fallback
    const requestId = error.response?.data?.requestId
    return requestId ? `${message} Reference: ${requestId}` : message
  }

  return error instanceof Error ? error.message : fallback
}
