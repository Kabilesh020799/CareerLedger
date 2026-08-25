import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";
import type { StartSprintInput } from "../validators/sprint.validator";
import { applicationAccess } from "./workspace-access.service";

export type SprintStatusValue = "ACTIVE" | "CLOSED";

export interface SprintSummary {
  id: string;
  userId: string;
  workspaceId: string | null;
  name: string;
  sequence: number;
  status: SprintStatusValue;
  startedAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CurrentSprintResult {
  sprint: SprintSummary | null;
  applications: SprintApplication[];
}

export interface StartSprintResult {
  sprint: SprintSummary;
  previousSprint: SprintSummary | null;
  carriedOverCount: number;
  closedRejectedCount: number;
}

const applicationInclude = {
  resumeVersion: {
    select: { id: true, name: true, notes: true },
  },
  resumeAttachment: {
    select: {
      fileName: true,
      mimeType: true,
      size: true,
      createdAt: true,
    },
  },
  coverLetterAttachment: {
    select: { fileName: true, mimeType: true, size: true, createdAt: true },
  },
  sprint: {
    select: { id: true, name: true, sequence: true, status: true },
  },
} satisfies Prisma.ApplicationInclude;

type SprintApplication = Prisma.ApplicationGetPayload<{
  include: typeof applicationInclude;
}>;

interface SprintRecord {
  id: string;
  userId: string;
  workspaceId: string | null;
  name: string;
  sequence: number;
  status: SprintStatusValue;
  startedAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type SprintWhere = {
  userId?: string;
  workspaceId?: string | null;
  status?: SprintStatusValue;
};

type SprintOrderBy =
  | { sequence: "asc" | "desc" }
  | { startedAt: "asc" | "desc" };

type ApplicationWhere = Prisma.ApplicationWhereInput & {
  sprintId?: string | null;
};

interface SprintDelegate {
  findMany(args: {
    where: SprintWhere;
    orderBy: SprintOrderBy | SprintOrderBy[];
  }): Promise<SprintRecord[]>;
  findFirst(args: {
    where: SprintWhere;
    orderBy?: SprintOrderBy | SprintOrderBy[];
  }): Promise<SprintRecord | null>;
  create(args: {
    data: {
      userId: string;
      workspaceId: string | null;
      name: string;
      sequence: number;
      status: SprintStatusValue;
      startedAt: Date;
    };
  }): Promise<SprintRecord>;
  update(args: {
    where: { id: string };
    data: { status: SprintStatusValue; closedAt: Date };
  }): Promise<SprintRecord>;
}

interface ApplicationDelegate {
  findMany(args: {
    where: ApplicationWhere;
    include: typeof applicationInclude;
    orderBy: Prisma.ApplicationOrderByWithRelationInput | Prisma.ApplicationOrderByWithRelationInput[];
  }): Promise<SprintApplication[]>;
  count(args: { where: ApplicationWhere }): Promise<number>;
}

interface SprintTransactionClient {
  sprint: SprintDelegate;
  application: ApplicationDelegate;
  $executeRaw(query: unknown): Promise<number>;
}

interface SprintPrismaClient {
  sprint: SprintDelegate;
  application: ApplicationDelegate;
  $transaction<T>(callback: (transaction: unknown) => Promise<T>): Promise<T>;
}

const database = prisma as unknown as SprintPrismaClient;

function sprintWhere(userId: string, workspaceId?: string): SprintWhere {
  return workspaceId
    ? { workspaceId }
    : { userId, workspaceId: null };
}

async function scopedAccess(userId: string, workspaceId: string | undefined, write = false) {
  const access = await applicationAccess(userId, workspaceId, write);
  return { access, where: sprintWhere(userId, workspaceId) };
}

function summary(sprint: SprintRecord): SprintSummary {
  return {
    id: sprint.id,
    userId: sprint.userId,
    workspaceId: sprint.workspaceId,
    name: sprint.name,
    sequence: sprint.sequence,
    status: sprint.status,
    startedAt: sprint.startedAt,
    closedAt: sprint.closedAt,
    createdAt: sprint.createdAt,
    updatedAt: sprint.updatedAt,
  };
}

function applicationScopeSql(
  userId: string,
  access: { workspaceId?: string; isPersonal?: boolean },
) {
  if (!access.workspaceId) return Prisma.sql`"userId" = ${userId}`;
  if (access.isPersonal) {
    return Prisma.sql`(
      "workspaceId" = ${access.workspaceId}
      OR ("workspaceId" IS NULL AND "userId" = ${userId})
    )`;
  }
  return Prisma.sql`"workspaceId" = ${access.workspaceId}`;
}

export const sprintService = {
  async list(userId: string, workspaceId?: string): Promise<SprintSummary[]> {
    const { where } = await scopedAccess(userId, workspaceId);
    const sprints = await database.sprint.findMany({
      where,
      orderBy: [{ sequence: "desc" }, { startedAt: "desc" }],
    });
    return sprints.map(summary);
  },

  async current(userId: string, workspaceId?: string): Promise<CurrentSprintResult> {
    const { access, where } = await scopedAccess(userId, workspaceId);
    const sprint = await database.sprint.findFirst({
      where: { ...where, status: "ACTIVE" },
      orderBy: [{ sequence: "desc" }, { startedAt: "desc" }],
    });

    if (!sprint) return { sprint: null, applications: [] };

    const applications = await database.application.findMany({
      where: { ...access.where, sprintId: sprint.id },
      include: applicationInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    return { sprint: summary(sprint), applications };
  },

  async start(
    userId: string,
    input: StartSprintInput,
    workspaceId?: string,
  ): Promise<StartSprintResult> {
    const { access, where } = await scopedAccess(userId, workspaceId, true);

    return database.$transaction(async (transaction) => {
      const databaseTransaction = transaction as SprintTransactionClient;
      const activeSprint = await databaseTransaction.sprint.findFirst({
        where: { ...where, status: "ACTIVE" },
        orderBy: [{ sequence: "desc" }, { startedAt: "desc" }],
      });
      const latestSprint = activeSprint
        ? activeSprint
        : await databaseTransaction.sprint.findFirst({
            where,
            orderBy: [{ sequence: "desc" }, { startedAt: "desc" }],
          });
      const sequence = (activeSprint?.sequence ?? latestSprint?.sequence ?? 0) + 1;
      const now = new Date();

      const previousSprint = activeSprint
        ? await databaseTransaction.sprint.update({
            where: { id: activeSprint.id },
            data: { status: "CLOSED", closedAt: now },
          })
        : null;

      const sprint = await databaseTransaction.sprint.create({
        data: {
          userId,
          workspaceId: workspaceId ?? null,
          name: input.name?.trim() || `Sprint ${sequence}`,
          sequence,
          status: "ACTIVE",
          startedAt: now,
        },
      });

      let carriedOverCount = 0;
      let closedRejectedCount = 0;

      if (activeSprint) {
        closedRejectedCount = await databaseTransaction.application.count({
          where: {
            ...access.where,
            sprintId: activeSprint.id,
            status: "REJECTED",
          },
        });
        carriedOverCount = await databaseTransaction.$executeRaw(
          Prisma.sql`
            UPDATE "Application"
            SET "sprintId" = ${sprint.id}
            WHERE "sprintId" = ${activeSprint.id}
              AND "status" <> ${"REJECTED"}
              AND ${applicationScopeSql(userId, access)}
          `,
        );
      } else {
        carriedOverCount = await databaseTransaction.$executeRaw(
          Prisma.sql`
            UPDATE "Application"
            SET "sprintId" = ${sprint.id}
            WHERE "sprintId" IS NULL
              AND ${applicationScopeSql(userId, access)}
          `,
        );
      }

      return {
        sprint: summary(sprint),
        previousSprint: previousSprint ? summary(previousSprint) : null,
        carriedOverCount,
        closedRejectedCount,
      };
    });
  },
};
