import { prisma } from "../config/prisma";
import type { Prisma } from "../generated/prisma/client";
import type { ApplicationDiscoveryInput } from "../validators/application-discovery.validator";
import type {
  CreateApplicationInput,
  UpdateApplicationInput,
} from "../validators/application.validator";

export const applicationService = {
  list(userId: string) {
    return prisma.application.findMany({
      where: { userId },
      include: applicationInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  async search(userId: string, query: ApplicationDiscoveryInput) {
    const where: Prisma.ApplicationWhereInput = {
      userId,
      ...(query.search
        ? {
            OR: [
              { company: { contains: query.search, mode: "insensitive" } },
              { jobTitle: { contains: query.search, mode: "insensitive" } },
              { location: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.source
        ? { source: { equals: query.source, mode: "insensitive" } }
        : {}),
      ...(query.appliedFrom || query.appliedTo
        ? {
            appliedAt: {
              ...(query.appliedFrom ? { gte: query.appliedFrom } : {}),
              ...(query.appliedTo ? { lte: query.appliedTo } : {}),
            },
          }
        : {}),
    };
    const orderBy = applicationOrderBy(query.sortBy, query.sortOrder);

    const [total, data] = await prisma.$transaction([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        include: applicationInclude,
        orderBy: [orderBy, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    };
  },

  create(userId: string, data: CreateApplicationInput) {
    return prisma.$transaction(async (transaction) => {
      if (data.resumeVersionId) {
        const resumeVersion = await transaction.resumeVersion.findFirst({
          where: { id: data.resumeVersionId, userId },
          select: { id: true },
        });
        if (!resumeVersion) return null;
      }

      return transaction.application.create({
        data: { ...data, userId },
        include: applicationInclude,
      });
    });
  },

  findById(userId: string, id: string) {
    return prisma.application.findFirst({
      where: { id, userId },
      include: applicationInclude,
    });
  },

  async update(userId: string, id: string, data: UpdateApplicationInput) {
    return prisma.$transaction(async (transaction) => {
      const existing = await transaction.application.findFirst({
        where: { id, userId },
      });

      if (!existing) return null;

      if (data.resumeVersionId) {
        const resumeVersion = await transaction.resumeVersion.findFirst({
          where: { id: data.resumeVersionId, userId },
          select: { id: true },
        });
        if (!resumeVersion) return false;
      }

      const application = await transaction.application.update({
        where: { id },
        data,
        include: applicationInclude,
      });

      if (data.status && data.status !== existing.status) {
        await transaction.applicationEvent.create({
          data: {
            applicationId: id,
            type: "STATUS_CHANGE",
            description: `Status changed from ${existing.status} to ${data.status}`,
            fromStatus: existing.status,
            toStatus: data.status,
          },
        });
      }

      return application;
    });
  },

  async remove(userId: string, id: string) {
    const result = await prisma.application.deleteMany({ where: { id, userId } });
    return result.count > 0;
  },
};

const applicationInclude = {
  resumeVersion: {
    select: { id: true, name: true, notes: true },
  },
} satisfies Prisma.ApplicationInclude;

function applicationOrderBy(
  sortBy: ApplicationDiscoveryInput["sortBy"],
  sortOrder: ApplicationDiscoveryInput["sortOrder"],
): Prisma.ApplicationOrderByWithRelationInput {
  switch (sortBy) {
    case "appliedAt":
      return { appliedAt: { sort: sortOrder, nulls: "last" } };
    case "company":
      return { company: sortOrder };
    case "updatedAt":
      return { updatedAt: sortOrder };
    case "createdAt":
      return { createdAt: sortOrder };
  }
}
