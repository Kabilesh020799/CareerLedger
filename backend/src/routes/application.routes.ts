import { Router } from "express";
import { applicationController } from "../controllers/application.controller";
import { applicationResumeController } from "../controllers/application-resume.controller";
import { applicationEventController } from "../controllers/application-event.controller";
import { reminderController } from "../controllers/reminder.controller";
import { uploadApplicationAttachments } from "../middleware/application-attachment-upload";
import { applicationCoverLetterController } from "../controllers/application-cover-letter.controller";

export const applicationRouter = Router();

/**
 * @swagger
 * /api/applications:
 *   get:
 *     tags: [Applications]
 *     summary: List the signed-in user's applications
 *     description: Returns the legacy complete list. New collection consumers use the bounded search endpoint.
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
 *     description: Adds a company and role to the signed-in user's job-search pipeline, optionally with a private resume, cover letter, or both.
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       201:
 *         description: Application created
 */
applicationRouter.post("/", uploadApplicationAttachments, applicationController.create);
/**
 * @swagger
 * /api/applications/search:
 *   get:
 *     tags: [Applications]
 *     summary: Search, filter, sort, and paginate applications
 *     description: Returns bounded pages of at most 50 applications and reports aggregate request and database timing in response headers.
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       200:
 *         description: Paginated application results
 *         headers:
 *           Server-Timing:
 *             description: Aggregate database and total request durations; no query text or request data is retained.
 *             schema: { type: string }
 *           X-Response-Time-Ms:
 *             description: Total request duration in milliseconds.
 *             schema: { type: string }
 */
applicationRouter.get("/search", applicationController.search);
applicationRouter.post(
  "/resume-uploads",
  applicationResumeController.prepareUpload,
);
applicationRouter.delete(
  "/resume-uploads",
  applicationResumeController.abandonUpload,
);
applicationRouter.post("/cover-letter-uploads", applicationCoverLetterController.prepareUpload);
applicationRouter.delete("/cover-letter-uploads", applicationCoverLetterController.abandonUpload);
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
applicationRouter.get("/:id/cover-letter-download", applicationController.getCoverLetterDownload);
applicationRouter.get("/:id/cover-letter", applicationController.downloadCoverLetter);
applicationRouter.get("/:id", applicationController.getById);
applicationRouter.patch(
  "/:id",
  uploadApplicationAttachments,
  applicationController.update,
);
applicationRouter.delete("/:id", applicationController.remove);
