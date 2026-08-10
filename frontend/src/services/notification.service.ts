import { api } from './api'
import type { NotificationPreferenceInput, NotificationSettings } from '../types/notification'

function decodeVapidKey(value: string) {
  const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

export const notificationService = {
  async getSettings() {
    const settings = (await api.get<NotificationSettings>('/notifications/settings')).data
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return settings
    const registration = await navigator.serviceWorker.getRegistration('/notification-worker.js')
    return { ...settings, browserSubscribed: Boolean(await registration?.pushManager.getSubscription()) }
  },
  async updateSettings(input: NotificationPreferenceInput) {
    return (await api.patch<NotificationSettings>('/notifications/settings', input)).data
  },
  async subscribe(publicKey: string) {
    const registration = await navigator.serviceWorker.register('/notification-worker.js')
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') throw new Error('Browser notification permission was not granted.')
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(publicKey) })
    await api.post('/notifications/subscriptions', subscription.toJSON())
  },
  async unsubscribe() {
    const registration = await navigator.serviceWorker.getRegistration('/notification-worker.js')
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription) return
    await api.delete('/notifications/subscriptions', { data: { endpoint: subscription.endpoint } })
    await subscription.unsubscribe()
  },
}
