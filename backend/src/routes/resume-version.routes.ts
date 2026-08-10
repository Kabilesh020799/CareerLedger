import { Router } from "express";
import { resumeVersionController } from "../controllers/resume-version.controller";

export const resumeVersionRouter = Router();

resumeVersionRouter.get("/", resumeVersionController.list);
resumeVersionRouter.get("/uploads", resumeVersionController.listUploaded);
resumeVersionRouter.post("/", resumeVersionController.create);
resumeVersionRouter.patch("/:id", resumeVersionController.update);
resumeVersionRouter.delete("/:id", resumeVersionController.remove);
