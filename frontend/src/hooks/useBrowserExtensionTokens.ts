import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { browserExtensionService } from '../services/browserExtension.service'

export const browserExtensionTokenKey = ['browser-extension', 'tokens'] as const

export function useBrowserExtensionTokens() {
  return useQuery({ queryKey: browserExtensionTokenKey, queryFn: browserExtensionService.listTokens })
}

export function useCreateBrowserExtensionToken() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: browserExtensionService.createToken,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: browserExtensionTokenKey }),
  })
}

export function useRevokeBrowserExtensionToken() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: browserExtensionService.revokeToken,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: browserExtensionTokenKey }),
  })
}
