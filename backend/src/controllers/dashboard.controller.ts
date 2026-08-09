import type { Request, Response } from "express";
import { dashboardService } from "../services/dashboard.service";

function getUserId(req: Request) {
  if (!req.user) throw new Error("Authenticated user is missing");
  return req.user.id;
}

export const dashboardController = {
  async summary(req: Request, res: Response) {
    const summary = await dashboardService.getSummary(getUserId(req));
    res.json(summary);
  },
};
