import type { Request, Response } from "express";
import { browserExtensionService } from "../services/browser-extension.service";
import { captureJobPostingSchema, createExtensionTokenSchema } from "../validators/browser-extension.validator";

function userId(req: Request) {
  if (!req.user) throw new Error("Authenticated user is missing");
  return req.user.id;
}

function id(req: Request) {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : value;
}

export const browserExtensionController = {
  async listTokens(req: Request, res: Response) {
    res.json(await browserExtensionService.listTokens(userId(req)));
  },

  async createToken(req: Request, res: Response) {
    const parsed = createExtensionTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid extension token", details: parsed.error.flatten() });
      return;
    }
    res.status(201).json(await browserExtensionService.createToken(userId(req), parsed.data.name));
  },

  async revokeToken(req: Request, res: Response) {
    const revoked = await browserExtensionService.revokeToken(userId(req), id(req));
    if (!revoked.count) {
      res.status(404).json({ error: "Browser extension token not found" });
      return;
    }
    res.status(204).send();
  },

  async capture(req: Request, res: Response) {
    const parsed = captureJobPostingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid captured job posting", details: parsed.error.flatten() });
      return;
    }
    if (!req.extensionUserId) throw new Error("Extension user is missing");
    res.status(201).json(await browserExtensionService.capture(req.extensionUserId, parsed.data));
  },
};
