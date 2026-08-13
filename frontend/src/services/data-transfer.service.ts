import { api } from './api'
export const dataTransferService = {
  exportWorkspace: async (workspaceId: string) => (await api.get('/data/export', { params: { workspaceId }, responseType: 'blob' })).data as Blob,
  importWorkspace: async (workspaceId: string, document: unknown) => (await api.post<{created:number;skipped:number;total:number}>('/data/import', { workspaceId, document })).data,
}
