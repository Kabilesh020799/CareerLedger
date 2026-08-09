import { Router } from "express";
import { reminderController } from "../controllers/reminder.controller";

export const reminderRouter = Router();

reminderRouter.get("/suggestions", reminderController.listFollowUpSuggestions);
reminderRouter.post(
  "/suggestions/:id",
  reminderController.createSuggestedFollowUp,
);
reminderRouter.get("/", reminderController.listOpen);
reminderRouter.patch("/:id", reminderController.update);
reminderRouter.delete("/:id", reminderController.remove);
