import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../config/prisma";
import type { AdminUserListQuery } from "../validators/admin.validator";

function userFilter(search: string | undefined): Prisma.UserWhereInput {
  if (!search) return {};
  return {
    OR: ["email", "username", "name"].map((field) => ({
      [field]: { contains: search, mode: "insensitive" },
    })),
  };
}

export const adminService = {
  async listUsers(query: AdminUserListQuery) {
    const where = userFilter(query.search);
    const [totalUsers, verifiedUsers, passwordUsers, googleUsers, filteredUsers, users] =
      await prisma.$transaction([
        prisma.user.count(),
        prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
        prisma.user.count({ where: { passwordHash: { not: null } } }),
        prisma.user.count({ where: { googleId: { not: null } } }),
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
            emailVerifiedAt: true,
            passwordHash: true,
            googleId: true,
            createdAt: true,
            _count: {
              select: { applications: true, workspaceMemberships: true },
            },
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
      ]);

    return {
      summary: { totalUsers, verifiedUsers, passwordUsers, googleUsers },
      users: users.map(({ passwordHash, googleId, _count, ...user }) => ({
        ...user,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        authMethods: { password: Boolean(passwordHash), google: Boolean(googleId) },
        applicationCount: _count.applications,
        workspaceCount: _count.workspaceMemberships,
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: filteredUsers,
        totalPages: Math.ceil(filteredUsers / query.pageSize),
      },
    };
  },
};
