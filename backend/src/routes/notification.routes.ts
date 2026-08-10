import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";

export const notificationRouter = Router();
/** @swagger
 * /api/notifications/settings:
 *   get:
 *     tags: [Notifications]
 *     summary: Get available and enabled reminder notification channels
 */
notificationRouter.get("/settings", notificationController.getSettings);
/** @swagger
 * /api/notifications/settings:
 *   patch:
 *     tags: [Notifications]
 *     summary: Enable or disable email and browser push delivery
 */
notificationRouter.patch("/settings", notificationController.updateSettings);
/** @swagger
 * /api/notifications/subscriptions:
 *   post:
 *     tags: [Notifications]
 *     summary: Register the current browser for Web Push
 */
notificationRouter.post("/subscriptions", notificationController.subscribe);
/** @swagger
 * /api/notifications/subscriptions:
 *   delete:
 *     tags: [Notifications]
 *     summary: Remove the current browser's Web Push registration
 */
notificationRouter.delete("/subscriptions", notificationController.unsubscribe);
