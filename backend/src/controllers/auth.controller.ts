import type { NextFunction, Request, Response } from "express";
import { authConfig } from "../config/auth";
import { credentialAuthService } from "../services/credential-auth.service";
import { passwordLoginSchema } from "../validators/auth.validator";

export const authController = {
  session(req: Request, res: Response) {
    res.json({ user: req.user ?? null });
  },

  callback(_req: Request, res: Response) {
    res.redirect(authConfig.frontendUrl);
  },

  async passwordLogin(req: Request, res: Response, next: NextFunction) {
    const parsed = passwordLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid login data",
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const user = await credentialAuthService.authenticate(parsed.data);
      if (!user) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      req.login(user, (error) => {
        if (error) return next(error);
        res.json({ user });
      });
    } catch (error) {
      next(error);
    }
  },

  logout(req: Request, res: Response, next: NextFunction) {
    req.logout((logoutError) => {
      if (logoutError) return next(logoutError);

      req.session.destroy((sessionError) => {
        if (sessionError) return next(sessionError);
        res.clearCookie("job-tracker-session", {
          httpOnly: true,
          sameSite: "lax",
          secure: authConfig.secureCookie,
        });
        res.status(204).send();
      });
    });
  },
};
