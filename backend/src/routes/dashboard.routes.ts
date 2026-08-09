import { Router } from "express";
import { dashboardController } from "../controllers/dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", dashboardController.summary);
