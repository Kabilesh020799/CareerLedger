/** Public notification capabilities and the signed-in user's delivery choices. */
export type NotificationSettings = {
  emailEnabled: boolean
  browserPushEnabled: boolean
  emailAvailable: boolean
  browserPushAvailable: boolean
  vapidPublicKey: string | null
  browserSubscribed: boolean
}

/** Editable delivery-channel preference payload. */
export type NotificationPreferenceInput = Pick<NotificationSettings, 'emailEnabled' | 'browserPushEnabled'>
