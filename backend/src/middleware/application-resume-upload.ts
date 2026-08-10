import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { applicationResumeMaxBytes } from "../validators/application-resume.validator";

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: applicationResumeMaxBytes,
    files: 1,
  },
});

export function uploadApplicationResume(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  resumeUpload.single("resume")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Resume must be 5 MB or smaller"
          : "Unable to upload resume";
      res.status(400).json({ error: message });
      return;
    }

    next(error);
  });
}
