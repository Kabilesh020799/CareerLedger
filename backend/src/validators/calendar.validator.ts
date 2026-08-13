import { z } from "zod";

/** Validates the opaque bearer token embedded in a calendar subscription URL. */
export const calendarFeedTokenSchema = z.string().regex(/^[a-f0-9]{64}$/i);

/** Validates a reminder identifier before generating an individual calendar file. */
export const calendarReminderIdSchema = z.string().trim().min(1).max(200);
