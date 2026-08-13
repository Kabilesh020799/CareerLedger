import type { NextFunction, Request, Response } from "express";
import { authConfig } from "../config/auth";
import { AccountConfirmationError, accountService } from "../services/account.service";
import { deleteAccountSchema, updateProfileSchema } from "../validators/account.validator";

export const accountController = {
  async profile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await accountService.getProfile(req.user!.id);
      if (!profile) return void res.status(404).json({ error: "Account not found" });
      res.json(profile);
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid profile details", issues: parsed.error.issues });
      return;
    }
    try {
      res.json(await accountService.updateProfile(req.user!.id, parsed.data));
    } catch (error) {
      next(error);
    }
  },

  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    const parsed = deleteAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Account confirmation failed" });
      return;
    }
    try {
      await accountService.deleteAccount(req.user!.id, parsed.data);
      req.logout(() => {
        req.session.destroy(() => {
          res.clearCookie("job-tracker-session", {
            httpOnly: true,
            sameSite: "lax",
            secure: authConfig.secureCookie,
          });
          res.status(204).send();
        });
      });
    } catch (error) {
      if (error instanceof AccountConfirmationError) {
        res.status(403).json({ error: "Account confirmation failed" });
        return;
      }
      next(error);
    }
  },
};
