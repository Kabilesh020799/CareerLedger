import { z } from "zod";
import { applicationStatuses } from "./application.validator";
import { reminderTypes } from "./reminder.validator";

const nullableText = (max: number) => z.string().trim().max(max).nullable();
const dateTime = z.iso.datetime({ offset: true });

const eventSchema = z.object({
  type: z.enum(["NOTE", "STATUS_CHANGE"]),
  description: z.string().trim().min(1).max(2_000),
  fromStatus: z.enum(applicationStatuses).nullable(),
  toStatus: z.enum(applicationStatuses).nullable(),
  occurredAt: dateTime,
}).strict();

const reminderSchema = z.object({
  type: z.enum(reminderTypes),
  description: z.string().trim().min(1).max(200),
  dueAt: dateTime,
  completedAt: dateTime.nullable(),
}).strict();

const applicationSchema = z.object({
  company: z.string().trim().min(1).max(300),
  jobTitle: z.string().trim().min(1).max(300),
  location: nullableText(300),
  jobUrl: z.url().max(2_000).nullable(),
  source: nullableText(300),
  status: z.enum(applicationStatuses),
  notes: nullableText(10_000),
  jobDescription: nullableText(100_000),
  skills: z.array(z.string().trim().min(1).max(100)).max(200),
  experienceRequirements: nullableText(10_000),
  salaryMin: z.number().finite().nonnegative().nullable(),
  salaryMax: z.number().finite().nonnegative().nullable(),
  salaryCurrency: nullableText(10),
  salaryPeriod: nullableText(40),
  workMode: z.enum(["REMOTE", "HYBRID", "ONSITE"]).nullable(),
  capturedAt: dateTime.nullable(),
  appliedAt: dateTime.nullable(),
  createdAt: dateTime,
  events: z.array(eventSchema).max(500),
  reminders: z.array(reminderSchema).max(200),
}).strict();

export const portableDataDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: dateTime,
  workspace: z.object({ name: z.string().trim().min(1).max(80) }).strict(),
  applications: z.array(applicationSchema).max(1_000),
}).strict();

export const importPortableDataSchema = z.object({
  workspaceId: z.string().trim().min(1),
  document: portableDataDocumentSchema,
}).strict();

export const exportPortableDataQuerySchema = z.object({
  workspaceId: z.string().trim().min(1),
}).strict();

export type PortableDataDocument = z.infer<typeof portableDataDocumentSchema>;
export type ImportPortableDataInput = z.infer<typeof importPortableDataSchema>;
