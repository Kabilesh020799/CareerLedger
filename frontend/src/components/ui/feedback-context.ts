import { createContext, useContext } from 'react'

export type FeedbackStatus = 'success' | 'error' | 'info'

export type FeedbackContextValue = {
  show: (title: string, options?: { description?: string; status?: FeedbackStatus }) => void
}

export const FeedbackContext = createContext<FeedbackContextValue>({ show: () => undefined })

/** Returns the shared action-feedback dispatcher. */
export function useFeedback() {
  return useContext(FeedbackContext)
}
