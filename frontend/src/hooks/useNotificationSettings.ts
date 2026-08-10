import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationService } from '../services/notification.service'
import type { NotificationPreferenceInput } from '../types/notification'

const notificationSettingsKey = ['notification-settings'] as const

export function useNotificationSettings() {
  return useQuery({ queryKey: notificationSettingsKey, queryFn: notificationService.getSettings })
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NotificationPreferenceInput) => notificationService.updateSettings(input),
    onSuccess: (settings) => queryClient.setQueryData(notificationSettingsKey, settings),
  })
}

export function useBrowserPushSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ enabled, publicKey }: { enabled: boolean; publicKey: string }) => {
      if (enabled) await notificationService.subscribe(publicKey)
      else await notificationService.unsubscribe()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationSettingsKey }),
  })
}
