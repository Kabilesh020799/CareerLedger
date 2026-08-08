import { Router } from "express";
import { applicationController } from "../controllers/application.controller";
import { applicationEventController } from "../controllers/application-event.controller";

export const applicationRouter = Router();

applicationRouter.get("/", applicationController.list);
applicationRouter.post("/", applicationController.create);
applicationRouter.get("/:id/events", applicationEventController.list);
applicationRouter.post("/:id/events", applicationEventController.create);
applicationRouter.get("/:id", applicationController.getById);
applicationRouter.patch("/:id", applicationController.update);
applicationRouter.delete("/:id", applicationController.remove);
