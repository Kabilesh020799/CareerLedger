import { Router } from "express";
import { dataTransferController } from "../controllers/data-transfer.controller";

export const dataTransferRouter = Router();

dataTransferRouter.get("/export", dataTransferController.exportWorkspace);
dataTransferRouter.post("/import", dataTransferController.importWorkspace);
