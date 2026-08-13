import { z } from "zod";

export const createCalendarItemSchema = z.object({
  type: z.enum(["TASK", "EVENT", "REMINDER"]),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullable().optional(),
  applicationId: z.string().trim().min(1).max(200).nullable().optional(),
}).refine((value) => !value.endsAt || value.endsAt > value.startsAt, {
  message: "End time must be after start time",
  path: ["endsAt"],
});

export type CreateCalendarItemInput = z.infer<typeof createCalendarItemSchema>;
