import { z } from "zod";

export const workspaceRoles = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;
export const assignableWorkspaceRoles = ["ADMIN", "MEMBER", "VIEWER"] as const;

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required").max(80),
}).strict();

export const inviteWorkspaceMemberSchema = z.object({
  email: z.email().transform((email) => email.trim().toLocaleLowerCase("en-US")),
  role: z.enum(assignableWorkspaceRoles),
}).strict();

export const updateWorkspaceMemberSchema = z.object({
  role: z.enum(workspaceRoles),
}).strict();

export const acceptWorkspaceInvitationSchema = z.object({
  token: z.string().trim().min(32).max(256),
}).strict();

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type InviteWorkspaceMemberInput = z.infer<typeof inviteWorkspaceMemberSchema>;
export type UpdateWorkspaceMemberInput = z.infer<typeof updateWorkspaceMemberSchema>;
