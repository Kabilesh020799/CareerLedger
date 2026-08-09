import { z } from "zod";

export const reminderTypes = ["FOLLOW_UP", "DEADLINE"] as const;

export const createReminderSchema = z
  .object({
    type: z.enum(reminderTypes),
    description: z.string().trim().min(1).max(200),
    dueAt: z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
  })
  .strict();

export const updateReminderSchema = z
  .object({
    completed: z.boolean(),
  })
  .strict();

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
