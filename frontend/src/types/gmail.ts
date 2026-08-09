export type GmailStatus = {
  configured: boolean
  connected: boolean
  gmailEmail: string | null
  lastSyncedAt: string | null
  synchronizedMessages: number
}

export type GmailSyncResult = {
  synchronizationType: 'full' | 'incremental'
  fetchedMessages: number
  newMessages: number
  duplicateMessages: number
  lastSyncedAt: string
}
