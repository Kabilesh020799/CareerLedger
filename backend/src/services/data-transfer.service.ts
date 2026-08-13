import { prisma } from "../config/prisma";
import type { ImportPortableDataInput, PortableDataDocument } from "../validators/data-transfer.validator";
import { WorkspaceForbiddenError, WorkspaceNotFoundError } from "./workspace.service";

const writeRoles = new Set(["OWNER", "ADMIN", "MEMBER"]);

async function accessibleWorkspace(userId: string, workspaceId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: true },
  });
  if (!membership) throw new WorkspaceNotFoundError("Workspace not found");
  return membership;
}

function iso(value: Date | null) {
  return value?.toISOString() ?? null;
}

export const dataTransferService = {
  async exportWorkspace(userId: string, workspaceId: string, now = new Date()): Promise<PortableDataDocument> {
    const access = await accessibleWorkspace(userId, workspaceId);
    const ownership = access.workspace.isPersonal
      ? { OR: [{ workspaceId }, { workspaceId: null, userId }] }
      : { workspaceId };
    const applications = await prisma.application.findMany({
      where: ownership,
      select: {
        company: true,
        jobTitle: true,
        location: true,
        jobUrl: true,
        source: true,
        status: true,
        notes: true,
        jobDescription: true,
        skills: true,
        experienceRequirements: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        salaryPeriod: true,
        workMode: true,
        capturedAt: true,
        appliedAt: true,
        createdAt: true,
        events: {
          select: {
            type: true,
            description: true,
            fromStatus: true,
            toStatus: true,
            occurredAt: true,
          },
          orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
        },
        reminders: {
          select: { type: true, description: true, dueAt: true, completedAt: true },
          orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    return {
      schemaVersion: 1,
      exportedAt: now.toISOString(),
      workspace: { name: access.workspace.name },
      applications: applications.map((application) => ({
        ...application,
        capturedAt: iso(application.capturedAt),
        appliedAt: iso(application.appliedAt),
        createdAt: application.createdAt.toISOString(),
        events: application.events.map((event) => ({
          ...event,
          occurredAt: event.occurredAt.toISOString(),
        })),
        reminders: application.reminders.map((reminder) => ({
          ...reminder,
          dueAt: reminder.dueAt.toISOString(),
          completedAt: iso(reminder.completedAt),
        })),
      })),
    };
  },

  async importWorkspace(userId: string, input: ImportPortableDataInput) {
    const access = await accessibleWorkspace(userId, input.workspaceId);
    if (!writeRoles.has(access.role)) {
      throw new WorkspaceForbiddenError("Workspace write access is required");
    }

    return prisma.$transaction(async (transaction) => {
      const currentAccess = await transaction.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: input.workspaceId, userId } },
      });
      if (!currentAccess || !writeRoles.has(currentAccess.role)) {
        throw new WorkspaceForbiddenError("Workspace write access is required");
      }

      let created = 0;
      let skipped = 0;
      for (const application of input.document.applications) {
        const appliedAt = application.appliedAt ? new Date(application.appliedAt) : null;
        const duplicate = await transaction.application.findFirst({
          where: {
            ...(access.workspace.isPersonal
              ? {
                  OR: [
                    { workspaceId: input.workspaceId },
                    { workspaceId: null, userId },
                  ],
                }
              : { workspaceId: input.workspaceId }),
            company: application.company,
            jobTitle: application.jobTitle,
            jobUrl: application.jobUrl,
            appliedAt,
          },
          select: { id: true },
        });
        if (duplicate) {
          skipped += 1;
          continue;
        }

        await transaction.application.create({
          data: {
            company: application.company,
            jobTitle: application.jobTitle,
            location: application.location,
            jobUrl: application.jobUrl,
            source: application.source,
            status: application.status,
            notes: application.notes,
            jobDescription: application.jobDescription,
            skills: application.skills,
            experienceRequirements: application.experienceRequirements,
            salaryMin: application.salaryMin,
            salaryMax: application.salaryMax,
            salaryCurrency: application.salaryCurrency,
            salaryPeriod: application.salaryPeriod,
            workMode: application.workMode,
            capturedAt: application.capturedAt ? new Date(application.capturedAt) : null,
            appliedAt,
            createdAt: new Date(application.createdAt),
            userId,
            workspaceId: input.workspaceId,
            events: {
              create: application.events.map((event) => ({
                type: event.type,
                description: event.description,
                fromStatus: event.fromStatus,
                toStatus: event.toStatus,
                occurredAt: new Date(event.occurredAt),
              })),
            },
            reminders: {
              create: application.reminders.map((reminder) => ({
                type: reminder.type,
                description: reminder.description,
                dueAt: new Date(reminder.dueAt),
                completedAt: reminder.completedAt ? new Date(reminder.completedAt) : null,
              })),
            },
          },
        });
        created += 1;
      }

      return { created, skipped, total: input.document.applications.length };
    });
  },
};
