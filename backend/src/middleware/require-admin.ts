import type { NextFunction, Request, Response } from "express";
import { isAdminAccount } from "../config/admin";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !isAdminAccount(req.user.email)) {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }

  next();
}
