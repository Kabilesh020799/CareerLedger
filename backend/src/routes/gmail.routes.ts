import { Router } from "express";
import { gmailController } from "../controllers/gmail.controller";

export const gmailRouter = Router();

gmailRouter.get("/status", gmailController.status);
gmailRouter.get("/connect", gmailController.connect);
gmailRouter.get("/callback", gmailController.callback);
gmailRouter.post("/sync", gmailController.synchronize);
gmailRouter.get("/reviews", gmailController.listReviews);
gmailRouter.patch("/reviews/:id", gmailController.resolveReview);
gmailRouter.delete("/connection", gmailController.disconnect);
