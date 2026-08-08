import type { Request, Response } from "express";
import { applicationEventService } from "../services/application-event.service";
import { createApplicationEventSchema } from "../validators/application-event.validator";

function getId(req: Request) {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

function getUserId(req: Request) {
  if (!req.user) throw new Error("Authenticated user is missing");
  return req.user.id;
}

export const applicationEventController = {
  async list(req: Request, res: Response) {
    const events = await applicationEventService.list(
      getUserId(req),
      getId(req),
    );
    if (!events) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    res.json(events);
  },

  async create(req: Request, res: Response) {
    const parsed = createApplicationEventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid application event data",
        details: parsed.error.flatten(),
      });
      return;
    }

    const event = await applicationEventService.create(
      getUserId(req),
      getId(req),
      parsed.data,
    );
    if (!event) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    res.status(201).json(event);
  },
};
