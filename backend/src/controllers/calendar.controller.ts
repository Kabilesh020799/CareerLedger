import type { Request, Response } from "express";
import { calendarService } from "../services/calendar.service";
import { calendarFeedTokenSchema, calendarReminderIdSchema } from "../validators/calendar.validator";

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
