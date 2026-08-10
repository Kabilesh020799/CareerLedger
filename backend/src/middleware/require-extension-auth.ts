import type { NextFunction, Request, Response } from "express";
import { browserExtensionService } from "../services/browser-extension.service";

export async function requireExtensionAuth(req: Request, res: Response, next: NextFunction) {
  const authorization = req.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) {
    res.status(401).json({ error: "Browser extension authentication required" });
    return;
  }

  const authenticated = await browserExtensionService.authenticate(token);
  if (!authenticated) {
    res.status(401).json({ error: "Browser extension token is invalid, expired, or revoked" });
    return;
  }
  req.extensionUserId = authenticated.userId;
  next();
}
