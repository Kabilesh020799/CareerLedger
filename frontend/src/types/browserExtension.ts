export type BrowserExtensionToken = {
  id: string
  name: string
  tokenPrefix: string
  lastUsedAt: string | null
  expiresAt: string
  createdAt: string
}

export type CreatedBrowserExtensionToken = BrowserExtensionToken & { token: string }
