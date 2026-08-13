import session, { type SessionData } from "express-session";
import { prisma } from "../config/prisma";

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function expiresAt(sessionData: SessionData) {
  const cookieExpiry = sessionData.cookie.expires;
  return cookieExpiry ? new Date(cookieExpiry) : new Date(Date.now() + DEFAULT_TTL_MS);
}

export class PrismaSessionStore extends session.Store {
  get(
    sessionId: string,
    callback: (error: unknown, session?: SessionData | null) => void,
  ) {
    prisma.session
      .findUnique({ where: { id: sessionId } })
      .then(async (record) => {
        if (!record) return callback(null, null);

        if (record.expiresAt <= new Date()) {
          await prisma.session.deleteMany({ where: { id: sessionId } });
          return callback(null, null);
        }

        callback(null, JSON.parse(record.data) as SessionData);
      })
      .catch(callback);
  }

  set(sessionId: string, sessionData: SessionData, callback?: (error?: unknown) => void) {
    prisma.session
      .upsert({
        where: { id: sessionId },
        create: {
          id: sessionId,
          data: JSON.stringify(sessionData),
          expiresAt: expiresAt(sessionData),
          userId: sessionData.passport?.user ?? null,
        },
        update: {
          data: JSON.stringify(sessionData),
          expiresAt: expiresAt(sessionData),
          userId: sessionData.passport?.user ?? null,
        },
      })
      .then(() => callback?.())
      .catch((error: unknown) => callback?.(error));
  }

  destroy(sessionId: string, callback?: (error?: unknown) => void) {
    prisma.session
      .deleteMany({ where: { id: sessionId } })
      .then(() => callback?.())
      .catch((error: unknown) => callback?.(error));
  }

  touch(
    sessionId: string,
    sessionData: SessionData,
    callback?: (error?: unknown) => void,
  ) {
    prisma.session
      .updateMany({
        where: { id: sessionId },
        data: { expiresAt: expiresAt(sessionData) },
      })
      .then(() => callback?.())
      .catch((error: unknown) => callback?.(error));
  }
}
