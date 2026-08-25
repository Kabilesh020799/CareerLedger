import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../config/prisma";
import type { CaptureJobPostingInput } from "../validators/browser-extension.validator";

const tokenLifetimeMs = 90 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export const browserExtensionService = {
  listTokens(userId: string) {
    return prisma.browserExtensionToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, name: true, tokenPrefix: true, lastUsedAt: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async createToken(userId: string, name: string, now = new Date()) {
    const token = `jat_ext_${randomBytes(32).toString("base64url")}`;
    const created = await prisma.browserExtensionToken.create({
      data: {
        userId,
        name,
        tokenHash: hashToken(token),
        tokenPrefix: token.slice(0, 16),
        expiresAt: new Date(now.getTime() + tokenLifetimeMs),
      },
      select: { id: true, name: true, tokenPrefix: true, expiresAt: true, createdAt: true },
    });
    return { ...created, token };
  },

  revokeToken(userId: string, id: string) {
    return prisma.browserExtensionToken.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async authenticate(token: string, now = new Date()) {
    const record = await prisma.browserExtensionToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, userId: true, revokedAt: true, expiresAt: true },
    });
    if (!record || record.revokedAt || record.expiresAt <= now) return null;
    await prisma.browserExtensionToken.update({
      where: { id: record.id },
      data: { lastUsedAt: now },
    });
    return { userId: record.userId };
  },

  async capture(userId: string, input: CaptureJobPostingInput, now = new Date()) {
    const activeSprint = await prisma.sprint.findFirst({
      where: { userId, workspaceId: null, status: "ACTIVE" },
      orderBy: { sequence: "desc" },
      select: { id: true },
    });

    return prisma.application.create({
      data: {
        userId,
        ...(activeSprint ? { sprintId: activeSprint.id } : {}),
        company: input.company,
        jobTitle: input.jobTitle,
        location: input.location ?? null,
        jobUrl: input.jobUrl,
        jobDescription: input.jobDescription,
        skills: [...new Set(input.skills)],
        experienceRequirements: input.experienceRequirements ?? null,
        salaryMin: input.salaryMin ?? null,
        salaryMax: input.salaryMax ?? null,
        salaryCurrency: input.salaryCurrency ?? null,
        salaryPeriod: input.salaryPeriod ?? null,
        workMode: input.workMode ?? null,
        capturedAt: now,
        source: "Browser extension",
        status: "SAVED",
      },
    });
  },
};
