import type { NextFunction, Request, Response } from "express";
import { adminService } from "../services/admin.service";
import { adminUserListQuerySchema } from "../validators/admin.validator";

export const adminController = {
  async listUsers(req: Request, res: Response, next: NextFunction) {
    const parsed = adminUserListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid user list query", issues: parsed.error.issues });
      return;
    }
    try {
      res.json(await adminService.listUsers(parsed.data));
    } catch (error) {
      next(error);
    }
  },
};
