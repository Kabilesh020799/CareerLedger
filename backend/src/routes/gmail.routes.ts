import { Router } from "express";
import { gmailController } from "../controllers/gmail.controller";
import { uploadApplicationResume } from "../middleware/application-resume-upload";

export const gmailRouter = Router();

gmailRouter.get("/status", gmailController.status);
gmailRouter.get("/connect", gmailController.connect);
gmailRouter.get("/callback", gmailController.callback);
/**
 * @swagger
 * /api/gmail/sync:
 *   post:
 *     tags: [Gmail]
 *     summary: Queue a manual Gmail synchronization
 *     description: Returns immediately while the background worker fetches and classifies Gmail messages.
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       202:
 *         description: Synchronization queued
 *       409:
 *         description: Gmail is not connected
 *       503:
 *         description: Gmail or the background queue is unavailable
 */
gmailRouter.post("/sync", gmailController.synchronize);
/**
 * @swagger
 * /api/gmail/sync/{id}:
 *   get:
 *     tags: [Gmail]
 *     summary: Get a manual Gmail synchronization status
 *     description: Returns queued, running, completed, or a safe failed status for a job owned by the signed-in user.
 *     security:
 *       - sessionCookie: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Current synchronization status
 *       404:
 *         description: Job was not found for the signed-in user
 *       503:
 *         description: Background queue is unavailable
 */
gmailRouter.get("/sync/:id", gmailController.synchronizationStatus);
/** Configures the signed-in user's retryable automatic Gmail schedule. */
gmailRouter.patch("/schedule", gmailController.updateSchedule);
gmailRouter.get("/reviews", gmailController.listReviews);
gmailRouter.patch("/reviews/:id", uploadApplicationResume, gmailController.resolveReview);
gmailRouter.delete("/connection", gmailController.disconnect);
