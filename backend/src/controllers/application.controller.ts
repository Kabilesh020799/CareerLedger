import type { Request, Response } from "express";
import { applicationService } from "../services/application.service";
import {
  createApplicationSchema,
  updateApplicationSchema,
} from "../validators/application.validator";

function validationError(res: Response, error: unknown) {
  return res.status(400).json({
    error: "Invalid application data",
    details: error,
  });
}

function getId(req: Request) {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

export const applicationController = {
  async list(_req: Request, res: Response) {
    const applications = await applicationService.list();
    res.json(applications);
  },

  async create(req: Request, res: Response) {
    const parsed = createApplicationSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error.flatten());

    const application = await applicationService.create(parsed.data);
    res.status(201).json(application);
  },

  async getById(req: Request, res: Response) {
    const application = await applicationService.findById(getId(req));
    if (!application) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    res.json(application);
  },

  async update(req: Request, res: Response) {
    const parsed = updateApplicationSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error.flatten());

    const application = await applicationService.update(getId(req), parsed.data);
    if (!application) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    res.json(application);
  },

  async remove(req: Request, res: Response) {
    const deleted = await applicationService.remove(getId(req));
    if (!deleted) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    res.status(204).send();
  },
};
