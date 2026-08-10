import { Router } from "express";
import { applicationController } from "../controllers/application.controller";
import { applicationResumeController } from "../controllers/application-resume.controller";
import { applicationEventController } from "../controllers/application-event.controller";
import { reminderController } from "../controllers/reminder.controller";
import { uploadApplicationResume } from "../middleware/application-resume-upload";

export const applicationRouter = Router();

/**
 * @swagger
 * /api/applications:
 *   get:
 *     tags: [Applications]
 *     summary: List the signed-in user's applications
 *     description: Returns applications for the table, board, filtering, and search views.
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       200:
 *         description: Application list
 */
applicationRouter.get("/", applicationController.list);
/**
 * @swagger
 * /api/applications:
 *   post:
 *     tags: [Applications]
 *     summary: Create an application
 *     description: Adds a company and role to the signed-in user's job-search pipeline.
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       201:
 *         description: Application created
 */
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
/**
 * @swagger
 * /api/applications/{id}/events:
 *   post:
 *     tags: [Applications]
 *     summary: Add a timeline event
 *     description: Adds a manual note or event to an application timeline.
 *     security:
 *       - sessionCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Timeline event created
 */
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
