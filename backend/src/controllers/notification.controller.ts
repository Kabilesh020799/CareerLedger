import type { Request, Response } from "express";
import { notificationService } from "../services/notification.service";
import { notificationPreferenceSchema, pushSubscriptionSchema } from "../validators/notification.validator";

function userId(req: Request) {
  if (!req.user) throw new Error("Authenticated user is missing");
  return req.user.id;
}

export const notificationController = {
  async getSettings(req: Request, res: Response) { res.json(await notificationService.getSettings(userId(req))); },
  async updateSettings(req: Request, res: Response) {
    const parsed = notificationPreferenceSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid notification settings", details: parsed.error.flatten() }); return; }
    res.json(await notificationService.updateSettings(userId(req), parsed.data));
  },
  async subscribe(req: Request, res: Response) {
    const parsed = pushSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid push subscription", details: parsed.error.flatten() }); return; }
    const subscribed = await notificationService.subscribe(userId(req), parsed.data);
    if (!subscribed) { res.status(409).json({ error: "Push subscription is already registered" }); return; }
    res.status(204).send();
  },
  async unsubscribe(req: Request, res: Response) {
    const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : "";
    if (!endpoint) { res.status(400).json({ error: "Push endpoint is required" }); return; }
    await notificationService.unsubscribe(userId(req), endpoint);
    res.status(204).send();
  },
};
