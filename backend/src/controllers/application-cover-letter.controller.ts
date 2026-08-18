import type { Request, Response } from "express";
import { applicationCoverLetterStorageService } from "../services/application-cover-letter-storage.service";
import { applicationCoverLetterUploadKeySchema, createApplicationCoverLetterUploadSchema } from "../validators/application-cover-letter.validator";

const userId = (req: Request) => { if (!req.user) throw new Error("Authenticated user is missing"); return req.user.id; };
export const applicationCoverLetterController = {
  async prepareUpload(req: Request, res: Response) {
    const parsed = createApplicationCoverLetterUploadSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid cover letter upload", details: parsed.error.flatten() }); return; }
    if (!applicationCoverLetterStorageService.isConfigured()) { res.json({ mode: "database" }); return; }
    const result = await applicationCoverLetterStorageService.prepareUpload(userId(req), parsed.data);
    if (!result.success) { res.status(400).json({ error: result.error }); return; }
    res.status(201).json(result.data);
  },
  async abandonUpload(req: Request, res: Response) {
    const parsed = applicationCoverLetterUploadKeySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid cover letter upload" }); return; }
    const deleted = await applicationCoverLetterStorageService.abandonUpload(userId(req), parsed.data.storageKey);
    if (!deleted) { res.status(404).json({ error: "Uploaded cover letter not found" }); return; }
    res.status(204).send();
  },
};
