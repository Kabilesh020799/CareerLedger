import type { Request, Response } from "express";
import { sprintService } from "../services/sprint.service";
import { selectedWorkspaceId } from "../services/workspace-access.service";
import { startSprintSchema } from "../validators/sprint.validator";

function userId(req: Request) {
  if (!req.user) throw new Error("Authenticated user is missing");
  return req.user.id;
}

function workspaceId(req: Request) {
  return selectedWorkspaceId(req.headers["x-workspace-id"]);
}

export const sprintController = {
  async list(req: Request, res: Response) {
    const sprints = await sprintService.list(userId(req), workspaceId(req));
    res.json(sprints);
  },

  async current(req: Request, res: Response) {
    const result = await sprintService.current(userId(req), workspaceId(req));
    res.json(result);
  },

  async start(req: Request, res: Response) {
    const parsed = startSprintSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid sprint data",
        details: parsed.error.flatten(),
      });
      return;
    }

    const result = await sprintService.start(
      userId(req),
      parsed.data,
      workspaceId(req),
    );
    res.status(201).json(result);
  },
};
