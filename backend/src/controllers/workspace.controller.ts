import type { Request, Response } from "express";
import { workspaceService, WorkspaceConflictError, WorkspaceForbiddenError, WorkspaceInvitationInvalidError, WorkspaceNotFoundError } from "../services/workspace.service";
import { acceptWorkspaceInvitationSchema, createWorkspaceSchema, inviteWorkspaceMemberSchema, updateWorkspaceMemberSchema } from "../validators/workspace.validator";

function user(req: Request) {
  if (!req.user) throw new Error("Authenticated user is missing");
  return req.user;
}

function parameter(req: Request, name: string) {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

function sendWorkspaceError(res: Response, error: unknown) {
  if (error instanceof WorkspaceNotFoundError) return res.status(404).json({ error: error.message });
  if (error instanceof WorkspaceForbiddenError) return res.status(403).json({ error: error.message });
  if (error instanceof WorkspaceConflictError) return res.status(409).json({ error: error.message });
  if (error instanceof WorkspaceInvitationInvalidError) return res.status(400).json({ error: error.message });
  throw error;
}

export const workspaceController = {
  async list(req: Request, res: Response) {
    res.json(await workspaceService.list(user(req).id));
  },
  async create(req: Request, res: Response) {
    const parsed = createWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid workspace data", details: parsed.error.flatten() });
    res.status(201).json(await workspaceService.create(user(req).id, parsed.data));
  },
  async listMembers(req: Request, res: Response) {
    try { res.json(await workspaceService.listMembers(user(req).id, parameter(req, "id"))); }
    catch (error) { sendWorkspaceError(res, error); }
  },
  async invite(req: Request, res: Response) {
    const parsed = inviteWorkspaceMemberSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid invitation data", details: parsed.error.flatten() });
    try { res.status(201).json(await workspaceService.invite(user(req).id, parameter(req, "id"), parsed.data)); }
    catch (error) { sendWorkspaceError(res, error); }
  },
  async listInvitations(req: Request, res: Response) {
    try { res.json(await workspaceService.listInvitations(user(req).id, parameter(req, "id"))); }
    catch (error) { sendWorkspaceError(res, error); }
  },
  async revokeInvitation(req: Request, res: Response) {
    try {
      await workspaceService.revokeInvitation(user(req).id, parameter(req, "id"), parameter(req, "invitationId"));
      res.status(204).send();
    } catch (error) { sendWorkspaceError(res, error); }
  },
  async acceptInvitation(req: Request, res: Response) {
    const parsed = acceptWorkspaceInvitationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid invitation token" });
    try { res.json(await workspaceService.acceptInvitation(user(req).id, user(req).email, parsed.data.token)); }
    catch (error) { sendWorkspaceError(res, error); }
  },
  async updateMember(req: Request, res: Response) {
    const parsed = updateWorkspaceMemberSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid member data", details: parsed.error.flatten() });
    try {
      res.json(await workspaceService.updateMember(user(req).id, parameter(req, "id"), parameter(req, "userId"), parsed.data));
    } catch (error) { sendWorkspaceError(res, error); }
  },
  async removeMember(req: Request, res: Response) {
    try {
      await workspaceService.removeMember(user(req).id, parameter(req, "id"), parameter(req, "userId"));
      res.status(204).send();
    } catch (error) { sendWorkspaceError(res, error); }
  },
};
