import type { Request, Response } from "express";
import { applicationService } from "../services/application.service";
import { applicationResumeService } from "../services/application-resume.service";
import { applicationResumeStorageService } from "../services/application-resume-storage.service";
import { applicationDiscoverySchema } from "../validators/application-discovery.validator";
import {
  createApplicationSchema,
  updateApplicationSchema,
} from "../validators/application.validator";
import { validateApplicationResume } from "../validators/application-resume.validator";
import { selectedWorkspaceId } from "../services/workspace-access.service";

function validationError(res: Response, error: unknown) {
  return res.status(400).json({
    error: "Invalid application data",
    details: error,
  });
}

function getId(req: Request) {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

function getUserId(req: Request) {
  if (!req.user) throw new Error("Authenticated user is missing");
  return req.user.id;
}

function getWorkspaceId(req: Request) {
  return selectedWorkspaceId(req.headers["x-workspace-id"]);
}

async function resolveResume(
  req: Request,
  userId: string,
  storageKey: string | undefined,
) {
  if (req.file && storageKey) {
    return {
      success: false as const,
      error: "Choose only one resume upload method",
    };
  }

  if (req.file && applicationResumeStorageService.isConfigured()) {
    return {
      success: false as const,
      error: "Prepare the resume upload before saving the application",
    };
  }

  if (storageKey) {
    return applicationResumeStorageService.finalizeUpload(userId, storageKey);
  }

  return validateApplicationResume(req.file);
}

async function abandonResolvedUpload(userId: string, storageKey: string | undefined) {
  if (!storageKey) return;
  try {
    await applicationResumeStorageService.abandonUpload(userId, storageKey);
  } catch {
    // The bucket lifecycle policy remains the final fallback for unfinished uploads.
  }
}

function resolvedStorageKey(
  resume: Awaited<ReturnType<typeof resolveResume>>,
  requestedStorageKey: string | undefined,
) {
  if (
    resume.success &&
    resume.data &&
    "storageKey" in resume.data
  ) {
    return resume.data.storageKey;
  }
  return requestedStorageKey;
}

export const applicationController = {
  async list(req: Request, res: Response) {
    const applications = await applicationService.list(getUserId(req), getWorkspaceId(req));
    res.json(applications);
  },

  async search(req: Request, res: Response) {
    const parsed = applicationDiscoverySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid application query",
        details: parsed.error.flatten(),
      });
      return;
    }

    const result = await applicationService.search(getUserId(req), parsed.data, getWorkspaceId(req));
    res.json(result);
  },

  async create(req: Request, res: Response) {
    const parsed = createApplicationSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error.flatten());

    const userId = getUserId(req);
    const resume = await resolveResume(req, userId, parsed.data.resumeUploadKey);
    const cleanupStorageKey = resolvedStorageKey(
      resume,
      parsed.data.resumeUploadKey,
    );
    if (!resume.success) {
      await abandonResolvedUpload(userId, cleanupStorageKey);
      res.status(400).json({ error: resume.error });
      return;
    }

    let application;
    try {
      application = await applicationService.create(userId, parsed.data, resume.data, getWorkspaceId(req));
    } catch (error) {
      await abandonResolvedUpload(userId, cleanupStorageKey);
      throw error;
    }
    if (!application) {
      await abandonResolvedUpload(userId, cleanupStorageKey);
      res.status(400).json({ error: "Resume version not found" });
      return;
    }
    res.status(201).json(application);
  },

  async getById(req: Request, res: Response) {
    const application = await applicationService.findById(getUserId(req), getId(req), getWorkspaceId(req));
    if (!application) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    res.json(application);
  },

  async downloadResume(req: Request, res: Response) {
    const resume = await applicationResumeService.findForApplication(
      getUserId(req),
      getId(req),
      true,
      getWorkspaceId(req),
    );
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }

    if (resume.kind === "s3") {
      res.redirect(302, resume.url);
      return;
    }

    res.setHeader("Content-Type", resume.mimeType);
    res.setHeader("Content-Length", String(resume.size));
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${resume.fileName}"`,
    );
    res.send(Buffer.from(resume.content));
  },

  async getResumeDownload(req: Request, res: Response) {
    const resume = await applicationResumeService.findForApplication(
      getUserId(req),
      getId(req),
      false,
      getWorkspaceId(req),
    );
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }

    res.json({
      mode: resume.kind,
      url: resume.kind === "s3" ? resume.url : null,
    });
  },

  async update(req: Request, res: Response) {
    const parsed = updateApplicationSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error.flatten());

    const userId = getUserId(req);
    const resume = await resolveResume(req, userId, parsed.data.resumeUploadKey);
    const cleanupStorageKey = resolvedStorageKey(
      resume,
      parsed.data.resumeUploadKey,
    );
    if (!resume.success) {
      await abandonResolvedUpload(userId, cleanupStorageKey);
      res.status(400).json({ error: resume.error });
      return;
    }

    let application;
    try {
      application = await applicationService.update(
        userId,
        getId(req),
        parsed.data,
        resume.data,
        getWorkspaceId(req),
      );
    } catch (error) {
      await abandonResolvedUpload(userId, cleanupStorageKey);
      throw error;
    }
    if (application === false) {
      await abandonResolvedUpload(userId, cleanupStorageKey);
      res.status(400).json({ error: "Resume version not found" });
      return;
    }
    if (!application) {
      await abandonResolvedUpload(userId, cleanupStorageKey);
      res.status(404).json({ error: "Application not found" });
      return;
    }

    res.json(application);
  },

  async remove(req: Request, res: Response) {
    const deleted = await applicationService.remove(getUserId(req), getId(req), getWorkspaceId(req));
    if (!deleted) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    res.status(204).send();
  },
};
