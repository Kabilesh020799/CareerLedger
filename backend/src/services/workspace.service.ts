import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../config/prisma";
import type {
  CreateWorkspaceInput,
  InviteWorkspaceMemberInput,
  UpdateWorkspaceMemberInput,
} from "../validators/workspace.validator";

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000;
const managementRoles = new Set(["OWNER", "ADMIN"]);

export class WorkspaceNotFoundError extends Error {}
export class WorkspaceForbiddenError extends Error {}
export class WorkspaceConflictError extends Error {}
export class WorkspaceInvitationInvalidError extends Error {}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function membership(userId: string, workspaceId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

async function requireMembership(userId: string, workspaceId: string) {
  const member = await membership(userId, workspaceId);
  if (!member) throw new WorkspaceNotFoundError("Workspace not found");
  return member;
}

async function requireManager(userId: string, workspaceId: string) {
  const member = await requireMembership(userId, workspaceId);
  if (!managementRoles.has(member.role)) {
    throw new WorkspaceForbiddenError("Workspace manager access is required");
  }
  return member;
}

export const workspaceService = {
  async ensurePersonal(userId: string, name = "Personal workspace") {
    const existing = await prisma.workspace.findFirst({
      where: { isPersonal: true, members: { some: { userId, role: "OWNER" } } },
    });
    if (existing) return existing;

    return prisma.workspace.create({
      data: {
        name,
        isPersonal: true,
        members: { create: { userId, role: "OWNER" } },
      },
    });
  },

  async list(userId: string) {
    await this.ensurePersonal(userId);
    return prisma.workspaceMember.findMany({
      where: { userId },
      select: {
        role: true,
        joinedAt: true,
        workspace: {
          select: {
            id: true,
            name: true,
            isPersonal: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { applications: true, members: true } },
          },
        },
      },
      orderBy: [{ workspace: { isPersonal: "desc" } }, { joinedAt: "asc" }],
    });
  },

  create(userId: string, data: CreateWorkspaceInput) {
    return prisma.workspace.create({
      data: {
        name: data.name,
        members: { create: { userId, role: "OWNER" } },
      },
      include: { members: true },
    });
  },

  async listMembers(userId: string, workspaceId: string) {
    await requireMembership(userId, workspaceId);
    return prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        role: true,
        joinedAt: true,
        user: { select: { id: true, email: true, name: true, avatarUrl: true } },
      },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });
  },

  async invite(
    userId: string,
    workspaceId: string,
    data: InviteWorkspaceMemberInput,
    now = new Date(),
  ) {
    await requireManager(userId, workspaceId);
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existingUser && await membership(existingUser.id, workspaceId)) {
      throw new WorkspaceConflictError("This user is already a member");
    }

    const token = randomBytes(32).toString("base64url");
    const invitation = await prisma.$transaction(async (transaction) => {
      await transaction.workspaceInvitation.updateMany({
        where: {
          workspaceId,
          emailNormalized: data.email,
          acceptedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
      return transaction.workspaceInvitation.create({
        data: {
          workspaceId,
          emailNormalized: data.email,
          role: data.role,
          tokenHash: tokenHash(token),
          invitedById: userId,
          expiresAt: new Date(now.getTime() + INVITATION_LIFETIME_MS),
        },
        select: {
          id: true,
          emailNormalized: true,
          role: true,
          expiresAt: true,
          createdAt: true,
        },
      });
    });

    return { ...invitation, token };
  },

  async listInvitations(userId: string, workspaceId: string) {
    await requireManager(userId, workspaceId);
    return prisma.workspaceInvitation.findMany({
      where: { workspaceId, acceptedAt: null, revokedAt: null },
      select: {
        id: true,
        emailNormalized: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async revokeInvitation(userId: string, workspaceId: string, invitationId: string) {
    await requireManager(userId, workspaceId);
    const result = await prisma.workspaceInvitation.updateMany({
      where: { id: invitationId, workspaceId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!result.count) throw new WorkspaceNotFoundError("Invitation not found");
  },

  async acceptInvitation(userId: string, userEmail: string, token: string, now = new Date()) {
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { tokenHash: tokenHash(token) },
    });
    if (
      !invitation || invitation.acceptedAt || invitation.revokedAt ||
      invitation.expiresAt <= now ||
      invitation.emailNormalized !== userEmail.trim().toLocaleLowerCase("en-US")
    ) {
      throw new WorkspaceInvitationInvalidError("Invitation is invalid or expired");
    }

    return prisma.$transaction(async (transaction) => {
      const member = await transaction.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
        create: { workspaceId: invitation.workspaceId, userId, role: invitation.role },
        update: {},
      });
      const accepted = await transaction.workspaceInvitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
        data: { acceptedAt: now },
      });
      if (!accepted.count) throw new WorkspaceInvitationInvalidError("Invitation is invalid or expired");
      return member;
    });
  },

  async updateMember(
    userId: string,
    workspaceId: string,
    memberUserId: string,
    data: UpdateWorkspaceMemberInput,
  ) {
    const actor = await requireManager(userId, workspaceId);
    const target = await membership(memberUserId, workspaceId);
    if (!target) throw new WorkspaceNotFoundError("Workspace member not found");
    if ((target.role === "OWNER" || data.role === "OWNER") && actor.role !== "OWNER") {
      throw new WorkspaceForbiddenError("Only an owner can change owner access");
    }
    if (target.role === "OWNER" && data.role !== "OWNER") {
      const ownerCount = await prisma.workspaceMember.count({ where: { workspaceId, role: "OWNER" } });
      if (ownerCount <= 1) throw new WorkspaceConflictError("A workspace must keep at least one owner");
    }
    return prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: memberUserId } },
      data: { role: data.role },
    });
  },

  async removeMember(userId: string, workspaceId: string, memberUserId: string) {
    const actor = await requireManager(userId, workspaceId);
    const target = await membership(memberUserId, workspaceId);
    if (!target) throw new WorkspaceNotFoundError("Workspace member not found");
    if (target.role === "OWNER") {
      if (actor.role !== "OWNER") throw new WorkspaceForbiddenError("Only an owner can remove an owner");
      const ownerCount = await prisma.workspaceMember.count({ where: { workspaceId, role: "OWNER" } });
      if (ownerCount <= 1) throw new WorkspaceConflictError("A workspace must keep at least one owner");
    }
    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: memberUserId } },
    });
  },
};
