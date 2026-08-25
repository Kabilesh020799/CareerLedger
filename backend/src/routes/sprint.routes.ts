import { Router } from "express";
import { sprintController } from "../controllers/sprint.controller";

export const sprintRouter = Router();

/**
 * @swagger
 * /api/sprints:
 *   get:
 *     tags: [Sprints]
 *     summary: List sprint history
 *     description: Returns the signed-in user's or selected workspace's sprint history from newest to oldest.
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       200:
 *         description: Sprint history
 */
sprintRouter.get("/", sprintController.list);

/**
 * @swagger
 * /api/sprints/current:
 *   get:
 *     tags: [Sprints]
 *     summary: Get the current sprint
 *     description: Returns the active sprint and its applications, or an empty result before the first sprint starts.
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       200:
 *         description: Current sprint and applications
 */
sprintRouter.get("/current", sprintController.current);

/**
 * @swagger
 * /api/sprints/start:
 *   post:
 *     tags: [Sprints]
 *     summary: Start the next sprint
 *     description: Closes the active sprint and creates the next one transactionally. Rejected applications remain in the closed sprint while other applications carry over.
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       201:
 *         description: Sprint started
 */
sprintRouter.post("/start", sprintController.start);
