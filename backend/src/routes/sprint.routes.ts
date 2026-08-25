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
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Sprint'
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CurrentSprint'
 */
sprintRouter.get("/current", sprintController.current);

/**
 * @swagger
 * /api/sprints/archived:
 *   get:
 *     tags: [Sprints]
 *     summary: List archived sprints
 *     description: Returns closed sprints for the signed-in user or selected workspace, newest first, with every application still assigned to each closed sprint.
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       200:
 *         description: Archived sprint groups
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ArchivedSprintGroup'
 */
sprintRouter.get("/archived", sprintController.archived);

/**
 * @swagger
 * /api/sprints/schedule:
 *   post:
 *     tags: [Sprints]
 *     summary: Schedule an upcoming sprint
 *     description: Creates a future sprint plan after the active sprint and all existing scheduled plans. Scheduling does not change application assignments.
 *     security:
 *       - sessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [startsAt]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               durationDays:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 90
 *               startsAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Sprint scheduled
 *       400:
 *         description: Invalid scheduled sprint data
 *       409:
 *         description: The requested start time is in the past or overlaps an existing sprint plan
 */
sprintRouter.post("/schedule", sprintController.schedule);

/**
 * @swagger
 * /api/sprints/start:
 *   post:
 *     tags: [Sprints]
 *     summary: Start the next sprint
 *     description: After the active sprint reaches its configured end, closes it and creates the next one transactionally. Rejected applications remain in the closed sprint while other applications carry over. The first sprint defaults to 14 days; later sprints inherit the previous duration unless one is provided.
 *     security:
 *       - sessionCookie: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               durationDays:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 90
 *                 description: Sprint duration in whole days. Defaults to 14 for the first sprint or inherits the active sprint duration thereafter.
 *               scheduledSprintId:
 *                 type: string
 *                 description: Activates the next eligible scheduled sprint when its planned start has arrived.
 *     responses:
 *       201:
 *         description: Sprint started
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SprintStartResult'
 *       400:
 *         description: Invalid sprint name or duration
 *       409:
 *         description: The active sprint has not reached its configured end time
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SprintActiveConflict'
 */
sprintRouter.post("/start", sprintController.start);
