import type { Request, Response } from "express";
import { applicationResumeStorageService } from "../services/application-resume-storage.service";
import {
  applicationResumeUploadKeySchema,
  createApplicationResumeUploadSchema,
} from "../validators/application-resume.validator";

function getUserId(req: Request) {
  if (!req.user) throw new Error("Authenticated user is missing");
  return req.user.id;
}

export const applicationResumeController = {
  async prepareUpload(req: Request, res: Response) {
    const parsed = createApplicationResumeUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid resume upload",
        details: parsed.error.flatten(),
      });
      return;
    }

    if (!applicationResumeStorageService.isConfigured()) {
      res.json({ mode: "database" });
      return;
    }

    const result = await applicationResumeStorageService.prepareUpload(
      getUserId(req),
      parsed.data,
    );
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json(result.data);
  },

  async abandonUpload(req: Request, res: Response) {
    const parsed = applicationResumeUploadKeySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid resume upload" });
      return;
    }

    const deleted = await applicationResumeStorageService.abandonUpload(
      getUserId(req),
      parsed.data.storageKey,
    );
    if (!deleted) {
      res.status(404).json({ error: "Uploaded resume not found" });
      return;
    }

    res.status(204).send();
  },
};
