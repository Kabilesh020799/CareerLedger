import type { Request, Response } from "express";
import { resumeVersionService } from "../services/resume-version.service";
import {
  createResumeVersionSchema,
  updateResumeVersionSchema,
} from "../validators/resume-version.validator";

function getUserId(req: Request) {
  if (!req.user) throw new Error("Authenticated user is missing");
  return req.user.id;
}

function getId(req: Request) {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

function validationError(res: Response, details: unknown) {
  res.status(400).json({ error: "Invalid resume version data", details });
}

export const resumeVersionController = {
  async list(req: Request, res: Response) {
    res.json(await resumeVersionService.list(getUserId(req)));
  },

  async create(req: Request, res: Response) {
    const parsed = createResumeVersionSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error.flatten());
      return;
    }

    const result = await resumeVersionService.create(getUserId(req), parsed.data);
    if (result.kind === "conflict") {
      res.status(409).json({ error: "A resume version with this name already exists" });
      return;
    }

    res.status(201).json(result.data);
  },

  async update(req: Request, res: Response) {
    const parsed = updateResumeVersionSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error.flatten());
      return;
    }

    const result = await resumeVersionService.update(
      getUserId(req),
      getId(req),
      parsed.data,
    );
    if (result.kind === "not_found") {
      res.status(404).json({ error: "Resume version not found" });
      return;
    }
    if (result.kind === "conflict") {
      res.status(409).json({ error: "A resume version with this name already exists" });
      return;
    }

    res.json(result.data);
  },

  async remove(req: Request, res: Response) {
    const removed = await resumeVersionService.remove(getUserId(req), getId(req));
    if (!removed) {
      res.status(404).json({ error: "Resume version not found" });
      return;
    }

    res.status(204).send();
  },
};
