import { Router } from "express";
import { workspaceController } from "../controllers/workspace.controller";

export const workspaceRouter = Router();

workspaceRouter.get("/", workspaceController.list);
workspaceRouter.post("/", workspaceController.create);
workspaceRouter.post("/invitations/accept", workspaceController.acceptInvitation);
workspaceRouter.get("/:id/members", workspaceController.listMembers);
workspaceRouter.patch("/:id/members/:userId", workspaceController.updateMember);
workspaceRouter.delete("/:id/members/:userId", workspaceController.removeMember);
workspaceRouter.get("/:id/invitations", workspaceController.listInvitations);
workspaceRouter.post("/:id/invitations", workspaceController.invite);
workspaceRouter.delete("/:id/invitations/:invitationId", workspaceController.revokeInvitation);
