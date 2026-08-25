import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { workspaceService } from '../services/workspace.service'
import { setSelectedWorkspaceId } from '../services/api'

const storageKey = 'job-tracker-workspace-id'
const Context = createContext<{ workspaceId: string | null; setWorkspaceId: (id: string) => void; memberships: ReturnType<typeof useWorkspaces>['data']; isLoading: boolean } | null>(null)
export const workspaceQueryKey = ['workspaces'] as const
export function useWorkspaces() { return useQuery({ queryKey: workspaceQueryKey, queryFn: workspaceService.list }) }
export function WorkspaceProvider({ children }: PropsWithChildren) {
  const query = useWorkspaces(); const client = useQueryClient()
  const [workspaceId, setState] = useState<string | null>(() => localStorage.getItem(storageKey))
  useEffect(() => {
    if (!workspaceId && query.data?.[0]) {
      const nextWorkspaceId = query.data[0].workspace.id
      setSelectedWorkspaceId(nextWorkspaceId)
      setState(nextWorkspaceId)
      void client.invalidateQueries()
    }
  }, [client, query.data, workspaceId])
  useEffect(() => { setSelectedWorkspaceId(workspaceId); if (workspaceId) localStorage.setItem(storageKey, workspaceId) }, [workspaceId])
  const setWorkspaceId = (id: string) => { setSelectedWorkspaceId(id); setState(id); localStorage.setItem(storageKey,id); void client.invalidateQueries() }
  const value = useMemo(() => ({ workspaceId, setWorkspaceId, memberships: query.data, isLoading: query.isLoading }), [workspaceId, query.data, query.isLoading])
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useWorkspace() { const value=useContext(Context); if(!value) throw new Error('WorkspaceProvider missing'); return value }
