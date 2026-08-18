import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { applicationResumeMaxBytes } from "../validators/application-resume.validator";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: applicationResumeMaxBytes, files: 2 } });

export function uploadApplicationAttachments(req: Request, res: Response, next: NextFunction) {
  upload.fields([{ name: "resume", maxCount: 1 }, { name: "coverLetter", maxCount: 1 }])(req, res, (error: unknown) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const label = error.field === "coverLetter" ? "Cover letter" : "Resume";
      res.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? `${label} must be 5 MB or smaller` : "Unable to upload attachment" });
      return;
    }
    next(error);
  });
}

export function uploadedApplicationFile(req: Request, field: "resume" | "coverLetter") {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  return files?.[field]?.[0];
}
