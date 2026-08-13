import axios from 'axios'

/** Shared Axios client; credentials keeps the authenticated session cookie. */
export const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
})

let selectedWorkspaceId: string | null = localStorage.getItem('job-tracker-workspace-id')
export function setSelectedWorkspaceId(value: string | null) { selectedWorkspaceId = value }
api.interceptors.request.use((config) => {
  if (selectedWorkspaceId) config.headers.set('X-Workspace-Id', selectedWorkspaceId)
  return config
})
