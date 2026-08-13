import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../config/prisma";

type CalendarEntry = {
  uid: string;
  summary: string;
  description: string;
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  updatedAt: Date;
};

const publicApiUrl = (process.env.PUBLIC_API_URL ?? process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
const HOUR_MS = 60 * 60 * 1000;
const DEADLINE_DURATION_MS = 15 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function utc(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** Folds an iCalendar content line at 75 UTF-8 octets without splitting code points. */
function foldLine(line: string) {
  const output: string[] = [];
  let current = "";
  let bytes = 0;

  for (const character of line) {
    const characterBytes = Buffer.byteLength(character, "utf8");
    if (bytes + characterBytes > 75) {
      output.push(current);
      current = ` ${character}`;
      bytes = 1 + characterBytes;
    } else {
      current += character;
      bytes += characterBytes;
    }
  }
  output.push(current);
  return output.join("\r\n");
}

/** Serializes calendar entries as an RFC 5545-compatible calendar using CRLF. */
export function serializeCalendar(entries: CalendarEntry[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Job Application Tracker//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...entries.flatMap((entry) => [
      "BEGIN:VEVENT",
      `UID:${escapeText(entry.uid)}`,
      `DTSTAMP:${utc(entry.updatedAt)}`,
      `LAST-MODIFIED:${utc(entry.updatedAt)}`,
      `DTSTART:${utc(entry.startsAt)}`,
      `DTEND:${utc(entry.endsAt)}`,
      `SUMMARY:${escapeText(entry.summary)}`,
      `DESCRIPTION:${escapeText(entry.description)}`,
      ...(entry.location ? [`LOCATION:${escapeText(entry.location)}`] : []),
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

async function entriesForUser(userId: string): Promise<CalendarEntry[]> {
  const [deadlines, interviews] = await Promise.all([
    prisma.applicationReminder.findMany({
      where: { completedAt: null, type: "DEADLINE", application: { userId } },
      include: { application: { select: { company: true, jobTitle: true, location: true } } },
      orderBy: { dueAt: "asc" },
    }),
    prisma.applicationEvent.findMany({
      where: { toStatus: "INTERVIEW", application: { userId } },
      include: { application: { select: { company: true, jobTitle: true, location: true } } },
      orderBy: { occurredAt: "asc" },
    }),
  ]);

  return [
    ...deadlines.map((reminder) => ({
      uid: `deadline-${reminder.id}@job-application-tracker`,
      summary: `Deadline: ${reminder.application.company} — ${reminder.application.jobTitle}`,
      description: reminder.description,
      location: reminder.application.location,
      startsAt: reminder.dueAt,
      endsAt: new Date(reminder.dueAt.getTime() + DEADLINE_DURATION_MS),
      updatedAt: reminder.updatedAt,
    })),
    ...interviews.map((event) => ({
      uid: `interview-${event.id}@job-application-tracker`,
      summary: `Interview: ${event.application.company} — ${event.application.jobTitle}`,
      description: event.description,
      location: event.application.location,
      startsAt: event.occurredAt,
      endsAt: new Date(event.occurredAt.getTime() + HOUR_MS),
      updatedAt: event.createdAt,
    })),
  ].sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
}

export const calendarService = {
  async exportForUser(userId: string) {
    return serializeCalendar(await entriesForUser(userId));
  },

  async exportReminder(userId: string, reminderId: string) {
    const reminder = await prisma.applicationReminder.findFirst({
      where: { id: reminderId, completedAt: null, type: "DEADLINE", application: { userId } },
      include: { application: { select: { company: true, jobTitle: true, location: true } } },
    });
    if (!reminder) return null;
    return serializeCalendar([{
      uid: `deadline-${reminder.id}@job-application-tracker`,
      summary: `Deadline: ${reminder.application.company} — ${reminder.application.jobTitle}`,
      description: reminder.description,
      location: reminder.application.location,
      startsAt: reminder.dueAt,
      endsAt: new Date(reminder.dueAt.getTime() + DEADLINE_DURATION_MS),
      updatedAt: reminder.updatedAt,
    }]);
  },

  async subscriptionStatus(userId: string) {
    const active = await prisma.calendarFeedToken.findFirst({
      where: { userId, revokedAt: null },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return { active: Boolean(active), createdAt: active?.createdAt ?? null };
  },

  async rotateSubscription(userId: string) {
    const token = randomBytes(32).toString("hex");
    await prisma.$transaction([
      prisma.calendarFeedToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.calendarFeedToken.create({ data: { userId, tokenHash: hashToken(token) } }),
    ]);
    return { url: `${publicApiUrl}/api/calendar/feed/${token}` };
  },

  async revokeSubscription(userId: string) {
    await prisma.calendarFeedToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async exportForToken(token: string) {
    const record = await prisma.calendarFeedToken.findFirst({
      where: { tokenHash: hashToken(token), revokedAt: null },
      select: { userId: true },
    });
    if (!record) return null;
    return serializeCalendar(await entriesForUser(record.userId));
  },
};
