import { z } from "zod";

export const gmailSyncIntervals = [15, 30, 60, 180, 360, 720, 1440] as const;

export const updateGmailScheduleSchema = z
  .object({
    enabled: z.boolean(),
    intervalMinutes: z.union(gmailSyncIntervals.map((value) => z.literal(value))),
  })
  .strict();

export type UpdateGmailScheduleInput = z.infer<typeof updateGmailScheduleSchema>;
