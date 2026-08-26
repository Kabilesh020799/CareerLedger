import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { workspaceService } from '../services/workspace.service'
import { setSelectedWorkspaceId } from '../services/api'
import { useSession } from '../hooks/useSession'

const storageKey = 'job-tracker-workspace-id'
type WorkspaceContextValue = {
  workspaceId: string | null
  setWorkspaceId: (id: string) => void
  memberships: ReturnType<typeof useWorkspaces>['data']
  isLoading: boolean
  isError: boolean
  isReady: boolean
  refetch: () => Promise<unknown>
}

const Context = createContext<WorkspaceContextValue | null>(null)
export const workspaceQueryKey = ['workspaces'] as const

export function useWorkspaces() {
  const session = useSession()
  return useQuery({
    queryKey: workspaceQueryKey,
    queryFn: workspaceService.list,
    enabled: Boolean(session.data?.user),
  })
}

/** Loads the selected workspace before rendering protected workspace screens. */
export function WorkspaceProvider({ children }: PropsWithChildren) {
  const query = useWorkspaces(); const client = useQueryClient()
  const [workspaceId, setState] = useState<string | null>(() => localStorage.getItem(storageKey))
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!query.isSuccess || !query.data?.length) return

    const selectedWorkspace = workspaceId && query.data.some(({ workspace }) => workspace.id === workspaceId)
      ? workspaceId
      : query.data[0].workspace.id
    if (selectedWorkspace !== workspaceId) {
      setIsReady(false)
      setState(selectedWorkspace)
      return
    }

    setSelectedWorkspaceId(selectedWorkspace)
    localStorage.setItem(storageKey, selectedWorkspace)
    setIsReady(true)
  }, [query.data, query.isSuccess, workspaceId])

  useEffect(() => {
    if (isReady && workspaceId) void client.invalidateQueries()
  }, [client, isReady, workspaceId])

  const setWorkspaceId = (id: string) => {
    if (id === workspaceId) return
    setIsReady(false)
    setState(id)
  }
  const value = useMemo(() => ({
    workspaceId,
    setWorkspaceId,
    memberships: query.data,
    isLoading: query.isFetching,
    isError: query.isError,
    isReady,
    refetch: query.refetch,
  }), [isReady, query.data, query.isError, query.isFetching, query.refetch, workspaceId])
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useWorkspace() { const value=useContext(Context); if(!value) throw new Error('WorkspaceProvider missing'); return value }
