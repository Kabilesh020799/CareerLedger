import { Router } from "express";
import { accountController } from "../controllers/account.controller";

export const accountRouter = Router();

accountRouter.get("/", accountController.profile);
accountRouter.patch("/", accountController.updateProfile);
accountRouter.delete("/", accountController.deleteAccount);
