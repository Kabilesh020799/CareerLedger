import { Router } from "express";
import { reminderController } from "../controllers/reminder.controller";

export const reminderRouter = Router();

reminderRouter.get("/", reminderController.listOpen);
reminderRouter.patch("/:id", reminderController.update);
reminderRouter.delete("/:id", reminderController.remove);
