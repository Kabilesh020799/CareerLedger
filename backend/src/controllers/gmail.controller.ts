import type { NextFunction, Request, Response } from "express";
import { gmailConfig } from "../config/gmail";
import {
  GmailAuthorizationRequiredError,
  GmailApiError,
} from "../services/gmail-api.service";
import {
  GmailNotConfiguredError,
  GmailNotConnectedError,
  GmailQueueUnavailableError,
  gmailService,
} from "../services/gmail.service";
import {
  GmailUpdateReviewConflictError,
  GmailUpdateReviewNotFoundError,
  gmailUpdateReviewService,
} from "../services/gmail-update-review.service";
import { gmailCallbackQuerySchema } from "../validators/gmail.validator";
import { resolveGmailUpdateReviewSchema } from "../validators/gmail-update-review.validator";
import { updateGmailScheduleSchema } from "../validators/gmail-schedule.validator";

function getUser(req: Request) {
  if (!req.user) throw new Error("Authenticated user is missing");
  return req.user;
}

function getId(req: Request) {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

function redirectToGmail(res: Response, parameter: string) {
  res.redirect(`${gmailConfig.frontendUrl}/gmail?${parameter}`);
}

async function saveSession(req: Request) {
  await new Promise<void>((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });
}

function handleGmailError(
  error: unknown,
  res: Response,
  next: NextFunction,
) {
  if (error instanceof GmailNotConfiguredError) {
    res.status(503).json({ error: "Gmail integration is not configured" });
    return;
  }
  if (error instanceof GmailNotConnectedError) {
    res.status(409).json({ error: "Connect Gmail before synchronizing" });
    return;
  }
  if (error instanceof GmailQueueUnavailableError) {
    res.status(503).json({ error: "Automatic Gmail synchronization is temporarily unavailable" });
    return;
  }
  if (error instanceof GmailAuthorizationRequiredError) {
    res.status(409).json({
      error: "Gmail authorization has expired. Reconnect Gmail to continue.",
      code: "GMAIL_RECONNECT_REQUIRED",
    });
    return;
  }
  if (error instanceof GmailApiError) {
    res.status(502).json({ error: "Gmail could not complete the request" });
    return;
  }
  next(error);
}

export const gmailController = {
  async status(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await gmailService.status(getUser(req).id));
    } catch (error) {
      next(error);
    }
  },

  async connect(req: Request, res: Response, next: NextFunction) {
    try {
      const authorization = gmailService.beginAuthorization(getUser(req).email);
      req.session.gmailOAuthState = authorization.state;
      await saveSession(req);
      res.redirect(authorization.authorizationUrl);
    } catch (error) {
      handleGmailError(error, res, next);
    }
  },

  async callback(req: Request, res: Response, next: NextFunction) {
    const parsed = gmailCallbackQuerySchema.safeParse(req.query);
    const savedState = req.session.gmailOAuthState;
    delete req.session.gmailOAuthState;

    if (
      !parsed.success ||
      !savedState ||
      parsed.data.state !== savedState
    ) {
      await saveSession(req);
      redirectToGmail(res, "error=state");
      return;
    }

    await saveSession(req);
    if (parsed.data.error || !parsed.data.code) {
      redirectToGmail(res, "error=denied");
      return;
    }

    try {
      await gmailService.completeAuthorization(getUser(req).id, parsed.data.code);
      redirectToGmail(res, "connected=true");
    } catch (error) {
      if (
        error instanceof GmailNotConfiguredError ||
        error instanceof GmailAuthorizationRequiredError ||
        error instanceof GmailApiError
      ) {
        redirectToGmail(res, "error=oauth");
        return;
      }
      next(error);
    }
  },

  async synchronize(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await gmailService.synchronize(getUser(req).id));
    } catch (error) {
      handleGmailError(error, res, next);
    }
  },

  async updateSchedule(req: Request, res: Response, next: NextFunction) {
    const parsed = updateGmailScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid Gmail synchronization schedule",
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      res.json(await gmailService.updateSchedule(getUser(req).id, parsed.data));
    } catch (error) {
      handleGmailError(error, res, next);
    }
  },

  async disconnect(req: Request, res: Response, next: NextFunction) {
    try {
      await gmailService.disconnect(getUser(req).id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async listReviews(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await gmailUpdateReviewService.list(getUser(req).id));
    } catch (error) {
      next(error);
    }
  },

  async resolveReview(req: Request, res: Response, next: NextFunction) {
    const parsed = resolveGmailUpdateReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid Gmail update decision",
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      res.json(
        await gmailUpdateReviewService.resolve(
          getUser(req).id,
          getId(req),
          parsed.data,
        ),
      );
    } catch (error) {
      if (error instanceof GmailUpdateReviewNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof GmailUpdateReviewConflictError) {
        res.status(409).json({ error: error.message });
        return;
      }
      next(error);
    }
  },
};
