import type { Request, Response } from "express";
import { applicationService } from "../services/application.service";
import { applicationResumeService } from "../services/application-resume.service";
import { applicationDiscoverySchema } from "../validators/application-discovery.validator";
import {
  createApplicationSchema,
  updateApplicationSchema,
} from "../validators/application.validator";
import { validateApplicationResume } from "../validators/application-resume.validator";

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

function getUserId(req: Request) {
  if (!req.user) throw new Error("Authenticated user is missing");
  return req.user.id;
}

export const applicationController = {
  async list(req: Request, res: Response) {
    const applications = await applicationService.list(getUserId(req));
    res.json(applications);
  },

  async search(req: Request, res: Response) {
    const parsed = applicationDiscoverySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid application query",
        details: parsed.error.flatten(),
      });
      return;
    }

    const result = await applicationService.search(getUserId(req), parsed.data);
    res.json(result);
  },

  async create(req: Request, res: Response) {
    const parsed = createApplicationSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error.flatten());

    const resume = validateApplicationResume(req.file);
    if (!resume.success) {
      res.status(400).json({ error: resume.error });
      return;
    }

    const application = await applicationService.create(
      getUserId(req),
      parsed.data,
      resume.data,
    );
    if (!application) {
      res.status(400).json({ error: "Resume version not found" });
      return;
    }
    res.status(201).json(application);
  },

  async getById(req: Request, res: Response) {
    const application = await applicationService.findById(getUserId(req), getId(req));
    if (!application) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    res.json(application);
  },

  async downloadResume(req: Request, res: Response) {
    const resume = await applicationResumeService.findForApplication(
      getUserId(req),
      getId(req),
    );
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }

    res.setHeader("Content-Type", resume.mimeType);
    res.setHeader("Content-Length", String(resume.size));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${resume.fileName}"`,
    );
    res.send(Buffer.from(resume.content));
  },

  async update(req: Request, res: Response) {
    const parsed = updateApplicationSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error.flatten());

    const resume = validateApplicationResume(req.file);
    if (!resume.success) {
      res.status(400).json({ error: resume.error });
      return;
    }

    const application = await applicationService.update(
      getUserId(req),
      getId(req),
      parsed.data,
      resume.data,
    );
    if (application === false) {
      res.status(400).json({ error: "Resume version not found" });
      return;
    }
    if (!application) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    res.json(application);
  },

  async remove(req: Request, res: Response) {
    const deleted = await applicationService.remove(getUserId(req), getId(req));
    if (!deleted) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    res.status(204).send();
  },
};
