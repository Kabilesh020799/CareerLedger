import type { Request, Response } from "express";
import { calendarService } from "../services/calendar.service";
import { calendarFeedTokenSchema, calendarReminderIdSchema } from "../validators/calendar.validator";
import { createCalendarItemSchema } from "../validators/calendar-item.validator";
import { calendarItemService } from "../services/calendar-item.service";
import { selectedWorkspaceId } from "../services/workspace-access.service";

function userId(req: Request) {
  if (!req.user) throw new Error("Authenticated user is missing");
  return req.user.id;
}

function parameter(req: Request, name: string) {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

function sendCalendar(res: Response, calendar: string, fileName?: string) {
  res.set({
    "Cache-Control": "private, no-store",
    "Content-Type": "text/calendar; charset=utf-8",
    ...(fileName ? { "Content-Disposition": `attachment; filename="${fileName}"` } : {}),
  });
  res.send(calendar);
}

export const calendarController = {
  async list(req: Request, res: Response) {
    res.json(await calendarService.listForUser(userId(req)));
  },

  async createItem(req: Request, res: Response) {
    const parsed = createCalendarItemSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid calendar item", details: parsed.error.flatten() }); return; }
    const item = await calendarItemService.create(userId(req), parsed.data, selectedWorkspaceId(req.headers["x-workspace-id"]));
    if (!item) { res.status(404).json({ error: "Application not found" }); return; }
    res.status(201).json(item);
  },

  async exportAll(req: Request, res: Response) {
    sendCalendar(res, await calendarService.exportForUser(userId(req)), "job-tracker.ics");
  },

  async exportReminder(req: Request, res: Response) {
    const parsed = calendarReminderIdSchema.safeParse(parameter(req, "id"));
    if (!parsed.success) { res.status(404).json({ error: "Calendar event not found" }); return; }
    const calendar = await calendarService.exportReminder(userId(req), parsed.data);
    if (!calendar) { res.status(404).json({ error: "Calendar event not found" }); return; }
    sendCalendar(res, calendar, "job-tracker-deadline.ics");
  },

  async subscriptionStatus(req: Request, res: Response) {
    res.json(await calendarService.subscriptionStatus(userId(req)));
  },

  async rotateSubscription(req: Request, res: Response) {
    res.status(201).json(await calendarService.rotateSubscription(userId(req)));
  },

  async revokeSubscription(req: Request, res: Response) {
    await calendarService.revokeSubscription(userId(req));
    res.status(204).send();
  },

  async feed(req: Request, res: Response) {
    const parsed = calendarFeedTokenSchema.safeParse(parameter(req, "token"));
    if (!parsed.success) { res.status(404).json({ error: "Calendar feed not found" }); return; }
    const calendar = await calendarService.exportForToken(parsed.data);
    if (!calendar) { res.status(404).json({ error: "Calendar feed not found" }); return; }
    sendCalendar(res, calendar);
  },
};
