import { Router } from "express";
import { adminController } from "../controllers/admin.controller";

export const adminRouter = Router();

/** Lists paginated account metadata for a server-authorized administrator. */
adminRouter.get("/users", adminController.listUsers);
