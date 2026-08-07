import { Router } from "express";
import { applicationController } from "../controllers/application.controller";

export const applicationRouter = Router();

applicationRouter.get("/", applicationController.list);
applicationRouter.post("/", applicationController.create);
applicationRouter.get("/:id", applicationController.getById);
applicationRouter.patch("/:id", applicationController.update);
applicationRouter.delete("/:id", applicationController.remove);
