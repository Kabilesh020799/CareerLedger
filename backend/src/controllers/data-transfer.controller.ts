import type { Request, Response } from "express";
import { dataTransferService } from "../services/data-transfer.service";
import { WorkspaceForbiddenError, WorkspaceNotFoundError } from "../services/workspace.service";
import { exportPortableDataQuerySchema, importPortableDataSchema } from "../validators/data-transfer.validator";

function userId(req: Request) {
  if (!req.user) throw new Error("Authenticated user is missing");
  return req.user.id;
}

function accessError(res: Response, error: unknown) {
  if (error instanceof WorkspaceNotFoundError) return res.status(404).json({ error: error.message });
  if (error instanceof WorkspaceForbiddenError) return res.status(403).json({ error: error.message });
  throw error;
}

export const dataTransferController = {
  async exportWorkspace(req: Request, res: Response) {
    const parsed = exportPortableDataQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Invalid export request", details: parsed.error.flatten() });
    try {
      const document = await dataTransferService.exportWorkspace(userId(req), parsed.data.workspaceId);
      res.setHeader("Content-Disposition", `attachment; filename="careerledger-backup-${new Date().toISOString().slice(0, 10)}.json"`);
      res.json(document);
    } catch (error) { accessError(res, error); }
  },
  async importWorkspace(req: Request, res: Response) {
    const parsed = importPortableDataSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid backup document", details: parsed.error.flatten() });
    try { res.status(201).json(await dataTransferService.importWorkspace(userId(req), parsed.data)); }
    catch (error) { accessError(res, error); }
  },
};
