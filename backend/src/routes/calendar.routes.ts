import { Router } from "express";
import { calendarController } from "../controllers/calendar.controller";

/** Authenticated calendar downloads and subscription management. */
export const calendarRouter = Router();
calendarRouter.get("/events", calendarController.list);
calendarRouter.post("/items", calendarController.createItem);
calendarRouter.get("/export", calendarController.exportAll);
calendarRouter.get("/reminders/:id.ics", calendarController.exportReminder);
calendarRouter.get("/subscription", calendarController.subscriptionStatus);
calendarRouter.post("/subscription", calendarController.rotateSubscription);
calendarRouter.delete("/subscription", calendarController.revokeSubscription);

/** Public bearer-token feed for calendar clients that cannot send session cookies. */
export const calendarFeedRouter = Router();
calendarFeedRouter.get("/:token", calendarController.feed);
