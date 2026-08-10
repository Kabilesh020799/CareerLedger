import { Router } from "express";
import { applicationController } from "../controllers/application.controller";
import { applicationResumeController } from "../controllers/application-resume.controller";
import { applicationEventController } from "../controllers/application-event.controller";
import { reminderController } from "../controllers/reminder.controller";
import { uploadApplicationResume } from "../middleware/application-resume-upload";

export const applicationRouter = Router();

applicationRouter.get("/", applicationController.list);
applicationRouter.post("/", uploadApplicationResume, applicationController.create);
applicationRouter.get("/search", applicationController.search);
applicationRouter.post(
  "/resume-uploads",
  applicationResumeController.prepareUpload,
);
applicationRouter.delete(
  "/resume-uploads",
  applicationResumeController.abandonUpload,
);
applicationRouter.get("/:id/events", applicationEventController.list);
applicationRouter.post("/:id/events", applicationEventController.create);
applicationRouter.get("/:id/reminders", reminderController.listForApplication);
applicationRouter.post("/:id/reminders", reminderController.create);
applicationRouter.get(
  "/:id/resume-download",
  applicationController.getResumeDownload,
);
applicationRouter.get("/:id/resume", applicationController.downloadResume);
applicationRouter.get("/:id", applicationController.getById);
applicationRouter.patch(
  "/:id",
  uploadApplicationResume,
  applicationController.update,
);
applicationRouter.delete("/:id", applicationController.remove);
