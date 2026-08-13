import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  workspace: { findFirst: vi.fn(), create: vi.fn() },
  workspaceMember: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn(), delete: vi.fn() },
  workspaceInvitation: { findUnique: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
  user: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}));
const transactionMock = vi.hoisted(() => ({
  workspaceInvitation: { updateMany: vi.fn(), create: vi.fn() },
  workspaceMember: { upsert: vi.fn() },
}));

vi.mock("../config/prisma", () => ({ prisma: prismaMock }));

import { workspaceService, WorkspaceConflictError, WorkspaceInvitationInvalidError } from "./workspace.service";

describe("workspaceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) => callback(transactionMock));
  });

  it("creates a personal workspace once and lists memberships", async () => {
    prismaMock.workspace.findFirst.mockResolvedValue(null);
    prismaMock.workspace.create.mockResolvedValue({ id: "personal-1" });
    prismaMock.workspaceMember.findMany.mockResolvedValue([]);

    await workspaceService.list("user-1");

    expect(prismaMock.workspace.create).toHaveBeenCalledWith({
      data: {
        name: "Personal workspace",
        isPersonal: true,
        members: { create: { userId: "user-1", role: "OWNER" } },
      },
    });
    expect(prismaMock.workspaceMember.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1" } }));
  });

  it("rotates an invitation and returns the raw token only once", async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: "ADMIN" });
    prismaMock.user.findUnique.mockResolvedValue(null);
    transactionMock.workspaceInvitation.create.mockImplementation(({ data }) => Promise.resolve({
      id: "invite-1",
      emailNormalized: data.emailNormalized,
      role: data.role,
      expiresAt: data.expiresAt,
      createdAt: new Date(),
    }));

    const invitation = await workspaceService.invite("admin-1", "workspace-1", {
      email: "person@example.com",
      role: "MEMBER",
    }, new Date("2026-08-12T00:00:00.000Z"));

    expect(invitation.token.length).toBeGreaterThan(32);
    expect(transactionMock.workspaceInvitation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ emailNormalized: "person@example.com" }),
    }));
    expect(transactionMock.workspaceInvitation.create.mock.calls[0][0].data.tokenHash).not.toBe(invitation.token);
  });

  it("rejects an invitation when the authenticated email does not match", async () => {
    prismaMock.workspaceInvitation.findUnique.mockResolvedValue({
      id: "invite-1",
      workspaceId: "workspace-1",
      emailNormalized: "invited@example.com",
      role: "MEMBER",
      expiresAt: new Date("2026-08-20T00:00:00.000Z"),
      acceptedAt: null,
      revokedAt: null,
    });

    await expect(workspaceService.acceptInvitation(
      "user-1",
      "other@example.com",
      "a".repeat(43),
      new Date("2026-08-12T00:00:00.000Z"),
    )).rejects.toBeInstanceOf(WorkspaceInvitationInvalidError);
    expect(transactionMock.workspaceMember.upsert).not.toHaveBeenCalled();
  });

  it("does not demote the last workspace owner", async () => {
    prismaMock.workspaceMember.findUnique
      .mockResolvedValueOnce({ role: "OWNER" })
      .mockResolvedValueOnce({ role: "OWNER" });
    prismaMock.workspaceMember.count.mockResolvedValue(1);

    await expect(workspaceService.updateMember(
      "owner-1", "workspace-1", "owner-1", { role: "ADMIN" },
    )).rejects.toBeInstanceOf(WorkspaceConflictError);
    expect(prismaMock.workspaceMember.update).not.toHaveBeenCalled();
  });
});
