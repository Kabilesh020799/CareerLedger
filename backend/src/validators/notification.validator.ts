import { z } from "zod";

export const notificationPreferenceSchema = z.object({
  emailEnabled: z.boolean(),
  browserPushEnabled: z.boolean(),
}).strict();

export const pushSubscriptionSchema = z.object({
  endpoint: z.url().max(4000),
  keys: z.object({
    p256dh: z.string().min(1).max(1000),
    auth: z.string().min(1).max(1000),
  }).strict(),
}).strict();

export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>;
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
