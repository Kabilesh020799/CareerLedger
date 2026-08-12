import { Router } from "express";
import { gmailController } from "../controllers/gmail.controller";
import { uploadApplicationResume } from "../middleware/application-resume-upload";

export const gmailRouter = Router();

gmailRouter.get("/status", gmailController.status);
gmailRouter.get("/connect", gmailController.connect);
gmailRouter.get("/callback", gmailController.callback);
gmailRouter.post("/sync", gmailController.synchronize);
/** Configures the signed-in user's retryable automatic Gmail schedule. */
gmailRouter.patch("/schedule", gmailController.updateSchedule);
gmailRouter.get("/reviews", gmailController.listReviews);
gmailRouter.patch("/reviews/:id", uploadApplicationResume, gmailController.resolveReview);
gmailRouter.delete("/connection", gmailController.disconnect);
