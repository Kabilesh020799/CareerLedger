import { Router } from "express";
import { browserExtensionController } from "../controllers/browser-extension.controller";
import { requireAuth } from "../middleware/require-auth";
import { requireExtensionAuth } from "../middleware/require-extension-auth";

export const browserExtensionRouter = Router();

browserExtensionRouter.get("/tokens", requireAuth, browserExtensionController.listTokens);
browserExtensionRouter.post("/tokens", requireAuth, browserExtensionController.createToken);
browserExtensionRouter.delete("/tokens/:id", requireAuth, browserExtensionController.revokeToken);
/**
 * @swagger
 * /api/browser-extension/captures:
 *   post:
 *     summary: Save a reviewed job posting and its structured requirements
 *     tags: [Browser Extension]
 */
browserExtensionRouter.post("/captures", requireExtensionAuth, browserExtensionController.capture);
