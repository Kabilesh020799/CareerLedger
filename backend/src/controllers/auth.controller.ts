import type { NextFunction, Request, Response } from "express";
import { authConfig } from "../config/auth";
import { credentialAuthService } from "../services/credential-auth.service";
import { loginAbuseProtectionService } from "../services/login-abuse-protection.service";
import { passwordLoginSchema } from "../validators/auth.validator";

const invalidCredentialsResponse = { error: "Invalid username or password" };

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export const authController = {
  session(req: Request, res: Response) {
    res.json({ user: req.user ?? null });
  },

  callback(_req: Request, res: Response) {
    res.redirect(authConfig.frontendUrl);
  },

  async passwordLogin(req: Request, res: Response, next: NextFunction) {
    const decision = await loginAbuseProtectionService.begin(
      req.ip ?? req.socket.remoteAddress ?? "unknown-ip",
      req.body?.username,
    );
    if (decision.delayMs > 0) await delay(decision.delayMs);
    if (!decision.allowed) {
      res.setHeader("Retry-After", String(decision.retryAfterSeconds));
      res.status(429).json({ error: "Too many login attempts. Try again later." });
      return;
    }

    const parsed = passwordLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      await loginAbuseProtectionService.recordFailure(decision.attempt);
      res.status(401).json(invalidCredentialsResponse);
      return;
    }

    try {
      const user = await credentialAuthService.authenticate(parsed.data);
      if (!user) {
        await loginAbuseProtectionService.recordFailure(decision.attempt);
        res.status(401).json(invalidCredentialsResponse);
        return;
      }

      req.login(user, (error) => {
        if (error) return next(error);
        void loginAbuseProtectionService.recordSuccess(decision.attempt);
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
