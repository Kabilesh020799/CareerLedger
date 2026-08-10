import { describe, expect, it } from "vitest";
import { notificationPreferenceSchema, pushSubscriptionSchema } from "./notification.validator";

describe("notification validators", () => {
  it("accepts explicit channel preferences and a complete push subscription", () => {
    expect(notificationPreferenceSchema.safeParse({ emailEnabled: true, browserPushEnabled: false }).success).toBe(true);
    expect(pushSubscriptionSchema.safeParse({ endpoint: "https://push.example/id", keys: { p256dh: "key", auth: "auth" } }).success).toBe(true);
  });
  it("rejects incomplete push subscriptions", () => {
    expect(pushSubscriptionSchema.safeParse({ endpoint: "https://push.example/id", keys: { p256dh: "key" } }).success).toBe(false);
  });
});
