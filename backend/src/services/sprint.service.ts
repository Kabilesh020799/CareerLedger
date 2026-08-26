import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";
import type {
  ScheduleSprintInput,
  StartSprintInput,
  UpdateScheduledSprintInput,
} from "../validators/sprint.validator";
import { applicationAccess } from "./workspace-access.service";

export type SprintStatusValue = "ACTIVE" | "CLOSED" | "SCHEDULED";
export const DEFAULT_SPRINT_DURATION_DAYS = 14;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export class SprintNotEndedError extends Error {
  readonly endsAt: Date;

  constructor(endsAt: Date) {
    super("The current sprint has not ended yet.");
    this.name = "SprintNotEndedError";
    this.endsAt = endsAt;
  }
}

export class SprintScheduleConflictError extends Error {
  readonly scheduledStartAt?: Date;
  readonly requiredStartAt?: Date;

  constructor(
    message: string,
    details: { scheduledStartAt?: Date; requiredStartAt?: Date } = {},
  ) {
    super(message);
    this.name = "SprintScheduleConflictError";
    this.scheduledStartAt = details.scheduledStartAt;
    this.requiredStartAt = details.requiredStartAt;
  }
}

export class SprintNotFoundError extends Error {
  constructor() {
    super("Sprint not found");
    this.name = "SprintNotFoundError";
  }
}

export interface SprintSummary {
  id: string;
  userId: string;
  workspaceId: string | null;
  name: string;
  sequence: number;
  status: SprintStatusValue;
  durationDays: number;
  startedAt: Date;
  scheduledStartAt: Date | null;
  endsAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CurrentSprintResult {
  sprint: SprintSummary | null;
  applications: SprintApplication[];
}

/** Closed sprint metadata and the applications still assigned to it. */
export interface ArchivedSprintGroup {
  sprint: SprintSummary;
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

export type SprintApplication = Prisma.ApplicationGetPayload<{
  include: typeof applicationInclude;
}>;

interface SprintRecord {
  id: string;
  userId: string;
  workspaceId: string | null;
  name: string;
  sequence: number;
  status: SprintStatusValue;
  durationDays: number;
  startedAt: Date;
  scheduledStartAt: Date | null;
  endsAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type SprintWhere = {
  userId?: string;
  workspaceId?: string | null;
  status?: SprintStatusValue;
  id?: string;
};

type SprintOrderBy =
  | { sequence: "asc" | "desc" }
  | { startedAt: "asc" | "desc" }
  | { scheduledStartAt: "asc" | "desc" };

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
      durationDays: number;
      startedAt: Date;
      scheduledStartAt: Date | null;
      endsAt: Date;
    };
  }): Promise<SprintRecord>;
  update(args: {
    where: { id: string };
    data: {
      name?: string;
      durationDays?: number;
      status?: SprintStatusValue;
      closedAt?: Date | null;
      startedAt?: Date;
      scheduledStartAt?: Date | null;
      endsAt?: Date;
    };
  }): Promise<SprintRecord>;
  delete(args: { where: { id: string } }): Promise<SprintRecord>;
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
    durationDays: sprint.durationDays,
    startedAt: sprint.startedAt,
    scheduledStartAt: sprint.scheduledStartAt,
    endsAt: sprint.endsAt,
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

async function carryApplications(
  transaction: SprintTransactionClient,
  userId: string,
  access: { where: Prisma.ApplicationWhereInput; workspaceId?: string; isPersonal?: boolean },
  previousSprint: SprintRecord | null,
  nextSprint: SprintRecord,
) {
  let carriedOverCount = 0;
  let closedRejectedCount = 0;

  if (previousSprint) {
    closedRejectedCount = await transaction.application.count({
      where: {
        ...access.where,
        sprintId: previousSprint.id,
        status: "REJECTED",
      },
    });
    carriedOverCount = await transaction.$executeRaw(
      Prisma.sql`
        UPDATE "Application"
        SET "sprintId" = ${nextSprint.id}
        WHERE "sprintId" = ${previousSprint.id}
          AND "status" <> ${"REJECTED"}
          AND ${applicationScopeSql(userId, access)}
      `,
    );
  } else {
    carriedOverCount = await transaction.$executeRaw(
      Prisma.sql`
        UPDATE "Application"
        SET "sprintId" = ${nextSprint.id}
        WHERE "sprintId" IS NULL
          AND ${applicationScopeSql(userId, access)}
      `,
    );
  }

  return { carriedOverCount, closedRejectedCount };
}

function sprintIntervalsOverlap(
  startsAt: Date,
  endsAt: Date,
  otherStartsAt: Date,
  otherEndsAt: Date,
) {
  return startsAt < otherEndsAt && endsAt > otherStartsAt;
}

function assertNoSprintScheduleOverlap(
  startsAt: Date,
  endsAt: Date,
  activeSprint: SprintRecord | null,
  scheduledSprints: SprintRecord[],
  excludedSprintId?: string,
) {
  if (
    activeSprint &&
    sprintIntervalsOverlap(startsAt, endsAt, activeSprint.startedAt, activeSprint.endsAt)
  ) {
    throw new SprintScheduleConflictError(
      "The scheduled sprint overlaps the current sprint.",
      { scheduledStartAt: startsAt, requiredStartAt: activeSprint.endsAt },
    );
  }

  for (const scheduledSprint of scheduledSprints) {
    if (scheduledSprint.id === excludedSprintId || !scheduledSprint.scheduledStartAt) continue;
    if (
      sprintIntervalsOverlap(
        startsAt,
        endsAt,
        scheduledSprint.scheduledStartAt,
        scheduledSprint.endsAt,
      )
    ) {
      throw new SprintScheduleConflictError(
        "The scheduled sprint overlaps an existing scheduled sprint.",
        {
          scheduledStartAt: startsAt,
          requiredStartAt: scheduledSprint.endsAt,
        },
      );
    }
  }
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

  async archived(userId: string, workspaceId?: string): Promise<ArchivedSprintGroup[]> {
    const { access, where } = await scopedAccess(userId, workspaceId);
    const sprints = await database.sprint.findMany({
      where: { ...where, status: "CLOSED" },
      orderBy: [{ sequence: "desc" }, { startedAt: "desc" }],
    });

    return Promise.all(
      sprints.map(async (sprint) => {
        const applications = await database.application.findMany({
          where: { ...access.where, sprintId: sprint.id },
          include: applicationInclude,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        });

        return { sprint: summary(sprint), applications };
      }),
    );
  },

  async schedule(
    userId: string,
    input: ScheduleSprintInput,
    workspaceId?: string,
  ): Promise<SprintSummary> {
    const { where } = await scopedAccess(userId, workspaceId, true);
    const now = new Date();

    if (input.startsAt <= now) {
      throw new SprintScheduleConflictError(
        "A scheduled sprint must start in the future.",
        { scheduledStartAt: input.startsAt },
      );
    }

    return database.$transaction(async (transaction) => {
      const databaseTransaction = transaction as SprintTransactionClient;
      const activeSprint = await databaseTransaction.sprint.findFirst({
        where: { ...where, status: "ACTIVE" },
        orderBy: [{ sequence: "desc" }, { startedAt: "desc" }],
      });
      const latestScheduledSprint = await databaseTransaction.sprint.findFirst({
        where: { ...where, status: "SCHEDULED" },
        orderBy: [{ sequence: "desc" }, { scheduledStartAt: "desc" }],
      });

      if (activeSprint && input.startsAt < activeSprint.endsAt) {
        throw new SprintScheduleConflictError(
          "The scheduled sprint overlaps the current sprint.",
          { scheduledStartAt: input.startsAt, requiredStartAt: activeSprint.endsAt },
        );
      }

      if (latestScheduledSprint && input.startsAt < latestScheduledSprint.endsAt) {
        throw new SprintScheduleConflictError(
          "The scheduled sprint overlaps an existing scheduled sprint.",
          {
            scheduledStartAt: input.startsAt,
            requiredStartAt: latestScheduledSprint.endsAt,
          },
        );
      }

      const latestSprint = await databaseTransaction.sprint.findFirst({
        where,
        orderBy: [{ sequence: "desc" }, { startedAt: "desc" }],
      });
      const sequence = (latestSprint?.sequence ?? 0) + 1;
      const durationDays =
        input.durationDays ??
        activeSprint?.durationDays ??
        latestScheduledSprint?.durationDays ??
        latestSprint?.durationDays ??
        DEFAULT_SPRINT_DURATION_DAYS;
      const endsAt = new Date(input.startsAt.getTime() + durationDays * MILLISECONDS_PER_DAY);

      const scheduledSprint = await databaseTransaction.sprint.create({
        data: {
          userId,
          workspaceId: workspaceId ?? null,
          name: input.name?.trim() || `Sprint ${sequence}`,
          sequence,
          status: "SCHEDULED",
          durationDays,
          startedAt: input.startsAt,
          scheduledStartAt: input.startsAt,
          endsAt,
        },
      });

      return summary(scheduledSprint);
    });
  },

  async updateScheduled(
    userId: string,
    sprintId: string,
    input: UpdateScheduledSprintInput,
    workspaceId?: string,
  ): Promise<SprintSummary> {
    const { where } = await scopedAccess(userId, workspaceId, true);
    const now = new Date();

    return database.$transaction(async (transaction) => {
      const databaseTransaction = transaction as SprintTransactionClient;
      const scheduledSprint = await databaseTransaction.sprint.findFirst({
        where: { ...where, id: sprintId, status: "SCHEDULED" },
      });

      if (!scheduledSprint?.scheduledStartAt) throw new SprintNotFoundError();

      const startsAt = input.startsAt ?? scheduledSprint.scheduledStartAt;
      if (startsAt <= now) {
        throw new SprintScheduleConflictError(
          "A scheduled sprint must start in the future.",
          { scheduledStartAt: startsAt },
        );
      }

      const durationDays = input.durationDays ?? scheduledSprint.durationDays;
      const endsAt = new Date(startsAt.getTime() + durationDays * MILLISECONDS_PER_DAY);
      const activeSprint = await databaseTransaction.sprint.findFirst({
        where: { ...where, status: "ACTIVE" },
        orderBy: [{ sequence: "desc" }, { startedAt: "desc" }],
      });
      const scheduledSprints = await databaseTransaction.sprint.findMany({
        where: { ...where, status: "SCHEDULED" },
        orderBy: [{ sequence: "asc" }, { scheduledStartAt: "asc" }],
      });

      assertNoSprintScheduleOverlap(
        startsAt,
        endsAt,
        activeSprint,
        scheduledSprints,
        sprintId,
      );

      const scheduledIndex = scheduledSprints.findIndex(({ id }) => id === sprintId);
      const previousScheduledSprint = scheduledIndex > 0
        ? scheduledSprints[scheduledIndex - 1]
        : undefined;
      const nextScheduledSprint = scheduledIndex >= 0
        ? scheduledSprints[scheduledIndex + 1]
        : undefined;

      if (previousScheduledSprint && startsAt < previousScheduledSprint.endsAt) {
        throw new SprintScheduleConflictError(
          "The scheduled sprint must remain after the previous scheduled sprint.",
          {
            scheduledStartAt: startsAt,
            requiredStartAt: previousScheduledSprint.endsAt,
          },
        );
      }
      if (nextScheduledSprint?.scheduledStartAt && endsAt > nextScheduledSprint.scheduledStartAt) {
        throw new SprintScheduleConflictError(
          "The scheduled sprint must remain before the next scheduled sprint.",
          {
            scheduledStartAt: startsAt,
            requiredStartAt: nextScheduledSprint.scheduledStartAt,
          },
        );
      }

      const updatedSprint = await databaseTransaction.sprint.update({
        where: { id: sprintId },
        data: {
          name: input.name ?? scheduledSprint.name,
          durationDays,
          startedAt: startsAt,
          scheduledStartAt: startsAt,
          endsAt,
        },
      });

      return summary(updatedSprint);
    });
  },

  async cancelScheduled(
    userId: string,
    sprintId: string,
    workspaceId?: string,
  ): Promise<void> {
    const { where } = await scopedAccess(userId, workspaceId, true);

    await database.$transaction(async (transaction) => {
      const databaseTransaction = transaction as SprintTransactionClient;
      const scheduledSprint = await databaseTransaction.sprint.findFirst({
        where: { ...where, id: sprintId, status: "SCHEDULED" },
      });

      if (!scheduledSprint) throw new SprintNotFoundError();
      await databaseTransaction.sprint.delete({ where: { id: sprintId } });
    });
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
      const now = new Date();

      if (input.scheduledSprintId) {
        const scheduledSprint = await databaseTransaction.sprint.findFirst({
          where: {
            ...where,
            id: input.scheduledSprintId,
            status: "SCHEDULED",
          },
          orderBy: [{ sequence: "asc" }, { scheduledStartAt: "asc" }],
        });

        if (!scheduledSprint || !scheduledSprint.scheduledStartAt) {
          throw new SprintScheduleConflictError(
            "The requested scheduled sprint is not available.",
          );
        }

        const nextScheduledSprint = await databaseTransaction.sprint.findFirst({
          where: { ...where, status: "SCHEDULED" },
          orderBy: [{ sequence: "asc" }, { scheduledStartAt: "asc" }],
        });

        if (!nextScheduledSprint || nextScheduledSprint.id !== scheduledSprint.id) {
          throw new SprintScheduleConflictError(
            "The requested sprint is not the next scheduled sprint.",
          );
        }

        if (scheduledSprint.scheduledStartAt > now) {
          throw new SprintScheduleConflictError(
            "The scheduled sprint has not reached its start time.",
            { scheduledStartAt: scheduledSprint.scheduledStartAt },
          );
        }

        if (activeSprint && activeSprint.endsAt > now) {
          throw new SprintNotEndedError(activeSprint.endsAt);
        }

        const previousSprint = activeSprint
          ? await databaseTransaction.sprint.update({
              where: { id: activeSprint.id },
              data: { status: "CLOSED", closedAt: now },
            })
          : null;
        const sprint = await databaseTransaction.sprint.update({
          where: { id: scheduledSprint.id },
          data: {
            status: "ACTIVE",
            startedAt: now,
            scheduledStartAt: null,
            endsAt: new Date(now.getTime() + scheduledSprint.durationDays * MILLISECONDS_PER_DAY),
            closedAt: null,
          },
        });
        const { carriedOverCount, closedRejectedCount } = await carryApplications(
          databaseTransaction,
          userId,
          access,
          activeSprint,
          sprint,
        );

        return {
          sprint: summary(sprint),
          previousSprint: previousSprint ? summary(previousSprint) : null,
          carriedOverCount,
          closedRejectedCount,
        };
      }

      if (activeSprint && activeSprint.endsAt > now) {
        throw new SprintNotEndedError(activeSprint.endsAt);
      }

      const nextScheduledSprint = await databaseTransaction.sprint.findFirst({
        where: { ...where, status: "SCHEDULED" },
        orderBy: [{ sequence: "asc" }, { scheduledStartAt: "asc" }],
      });
      if (nextScheduledSprint) {
        throw new SprintScheduleConflictError(
          "A scheduled sprint is next. Start it from the upcoming sprint timeline.",
          nextScheduledSprint.scheduledStartAt
            ? { scheduledStartAt: nextScheduledSprint.scheduledStartAt }
            : {},
        );
      }

      const latestSprint = activeSprint
        ? activeSprint
        : await databaseTransaction.sprint.findFirst({
            where,
            orderBy: [{ sequence: "desc" }, { startedAt: "desc" }],
          });
      const sequence = (activeSprint?.sequence ?? latestSprint?.sequence ?? 0) + 1;
      const durationDays =
        input.durationDays ?? activeSprint?.durationDays ?? DEFAULT_SPRINT_DURATION_DAYS;
      const endsAt = new Date(now.getTime() + durationDays * MILLISECONDS_PER_DAY);

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
          durationDays,
          startedAt: now,
          scheduledStartAt: null,
          endsAt,
        },
      });

      const { carriedOverCount, closedRejectedCount } = await carryApplications(
        databaseTransaction,
        userId,
        access,
        activeSprint,
        sprint,
      );

      return {
        sprint: summary(sprint),
        previousSprint: previousSprint ? summary(previousSprint) : null,
        carriedOverCount,
        closedRejectedCount,
      };
    });
  },
};
