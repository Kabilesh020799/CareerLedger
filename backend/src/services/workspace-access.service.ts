import type { Prisma, WorkspaceRole } from "../generated/prisma/client";
import { prisma } from "../config/prisma";

const writeRoles = new Set<WorkspaceRole>(["OWNER", "ADMIN", "MEMBER"]);

export class WorkspaceAccessError extends Error {
  constructor(public readonly kind: "NOT_FOUND" | "FORBIDDEN") {
    super(kind === "NOT_FOUND" ? "Workspace not found" : "Workspace is read-only");
  }
}

/** Resolves the selected workspace while retaining legacy user ownership when no header is supplied. */
export async function applicationAccess(
  userId: string,
  workspaceId: string | undefined,
  write = false,
): Promise<{ where: Prisma.ApplicationWhereInput; workspaceId?: string }> {
  if (!workspaceId) return { where: { userId } };
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: { select: { isPersonal: true } } },
  });
  if (!member) throw new WorkspaceAccessError("NOT_FOUND");
  if (write && !writeRoles.has(member.role)) throw new WorkspaceAccessError("FORBIDDEN");
  return {
    workspaceId,
    where: member.workspace.isPersonal
      ? { OR: [{ workspaceId }, { workspaceId: null, userId }] }
      : { workspaceId },
  };
}

/** Reads and validates the optional workspace selection header. */
export function selectedWorkspaceId(header: string | string[] | undefined) {
  const value = Array.isArray(header) ? header[0] : header;
  const normalized = value?.trim();
  return normalized || undefined;
}
