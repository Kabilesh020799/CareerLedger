import type { Request, Response } from "express";
import { reminderService } from "../services/reminder.service";
import {
  createReminderSchema,
  updateReminderSchema,
} from "../validators/reminder.validator";
import { selectedWorkspaceId } from "../services/workspace-access.service";

function getWorkspaceId(req: Request) {
  return selectedWorkspaceId(req.headers["x-workspace-id"]);
}

function getParameter(req: Request, name: string) {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

function getUserId(req: Request) {
  if (!req.user) throw new Error("Authenticated user is missing");
  return req.user.id;
}

export const reminderController = {
  async listForApplication(req: Request, res: Response) {
    const reminders = await reminderService.listForApplication(
      getUserId(req),
      getParameter(req, "id"),
      getWorkspaceId(req),
    );
    if (!reminders) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    res.json(reminders);
  },

  async listOpen(req: Request, res: Response) {
    const reminders = await reminderService.listOpen(getUserId(req), getWorkspaceId(req));
    res.json(reminders);
  },

  async listFollowUpSuggestions(req: Request, res: Response) {
    const suggestions = await reminderService.listFollowUpSuggestions(
      getUserId(req),
    );
    res.json(suggestions);
  },

  async createSuggestedFollowUp(req: Request, res: Response) {
    const reminder = await reminderService.createSuggestedFollowUp(
      getUserId(req),
      getParameter(req, "id"),
    );
    if (!reminder) {
      res.status(404).json({ error: "Follow-up suggestion not found" });
      return;
    }

    res.status(201).json(reminder);
  },

  async create(req: Request, res: Response) {
    const parsed = createReminderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid reminder data",
        details: parsed.error.flatten(),
      });
      return;
    }

    const reminder = await reminderService.create(
      getUserId(req),
      getParameter(req, "id"),
      parsed.data,
      getWorkspaceId(req),
    );
    if (!reminder) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    res.status(201).json(reminder);
  },

  async update(req: Request, res: Response) {
    const parsed = updateReminderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid reminder data",
        details: parsed.error.flatten(),
      });
      return;
    }

    const reminder = await reminderService.updateCompletion(
      getUserId(req),
      getParameter(req, "id"),
      parsed.data.completed,
      getWorkspaceId(req),
    );
    if (!reminder) {
      res.status(404).json({ error: "Reminder not found" });
      return;
    }

    res.json(reminder);
  },

  async remove(req: Request, res: Response) {
    const removed = await reminderService.remove(
      getUserId(req),
      getParameter(req, "id"),
      getWorkspaceId(req),
    );
    if (!removed) {
      res.status(404).json({ error: "Reminder not found" });
      return;
    }

    res.status(204).send();
  },
};
