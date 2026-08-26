import type { Request, Response } from "express";
import {
  SprintNotFoundError,
  SprintNotEndedError,
  SprintScheduleConflictError,
  sprintService,
} from "../services/sprint.service";
import { selectedWorkspaceId } from "../services/workspace-access.service";
import {
  scheduleSprintSchema,
  startSprintSchema,
  updateScheduledSprintSchema,
} from "../validators/sprint.validator";

function userId(req: Request) {
  if (!req.user) throw new Error("Authenticated user is missing");
  return req.user.id;
}

function workspaceId(req: Request) {
  return selectedWorkspaceId(req.headers["x-workspace-id"]);
}

function sprintId(req: Request) {
  const id = req.params.id;
  if (typeof id !== "string") throw new Error("Sprint ID is missing");
  return id;
}

function sprintConflictResponse(error: SprintScheduleConflictError) {
  return {
    error: error.message,
    ...(error.scheduledStartAt
      ? { scheduledStartAt: error.scheduledStartAt.toISOString() }
      : {}),
    ...(error.requiredStartAt
      ? { requiredStartAt: error.requiredStartAt.toISOString() }
      : {}),
  };
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

  async archived(req: Request, res: Response) {
    const result = await sprintService.archived(userId(req), workspaceId(req));
    res.json(result);
  },

  async schedule(req: Request, res: Response) {
    const parsed = scheduleSprintSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid scheduled sprint data",
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const result = await sprintService.schedule(
        userId(req),
        parsed.data,
        workspaceId(req),
      );
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof SprintScheduleConflictError) {
        res.status(409).json(sprintConflictResponse(error));
        return;
      }
      throw error;
    }
  },

  async update(req: Request, res: Response) {
    const parsed = updateScheduledSprintSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid scheduled sprint data",
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const result = await sprintService.updateScheduled(
        userId(req),
        sprintId(req),
        parsed.data,
        workspaceId(req),
      );
      res.json(result);
    } catch (error) {
      if (error instanceof SprintNotFoundError) {
        res.status(404).json({ error: "Sprint not found" });
        return;
      }
      if (error instanceof SprintScheduleConflictError) {
        res.status(409).json(sprintConflictResponse(error));
        return;
      }
      throw error;
    }
  },

  async cancel(req: Request, res: Response) {
    try {
      await sprintService.cancelScheduled(userId(req), sprintId(req), workspaceId(req));
      res.status(204).send();
    } catch (error) {
      if (error instanceof SprintNotFoundError) {
        res.status(404).json({ error: "Sprint not found" });
        return;
      }
      throw error;
    }
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

    try {
      const result = await sprintService.start(
        userId(req),
        parsed.data,
        workspaceId(req),
      );
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof SprintNotEndedError) {
        res.status(409).json({
          error: error.message,
          endsAt: error.endsAt.toISOString(),
        });
        return;
      }
      if (error instanceof SprintScheduleConflictError) {
        res.status(409).json(sprintConflictResponse(error));
        return;
      }
      throw error;
    }
  },
};
