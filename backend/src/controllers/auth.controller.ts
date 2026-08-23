import type { NextFunction, Request, Response } from "express";
import { authConfig } from "../config/auth";
import { CredentialAlreadyExistsError, credentialAuthService } from "../services/credential-auth.service";
import { authRecoveryAbuseProtectionService } from "../services/auth-recovery-abuse-protection.service";
import {
  loginAbuseProtectionService,
  PROTECTION_UNAVAILABLE_RETRY_AFTER_SECONDS,
} from "../services/login-abuse-protection.service";
import { signupAbuseProtectionService } from "../services/signup-abuse-protection.service";
import { authTokenService } from "../services/auth-token.service";
import { isAdminAccount } from "../config/admin";
import { emailRequestSchema, passwordLoginSchema, passwordSignupSchema, resetPasswordSchema, tokenSchema } from "../validators/auth.validator";

const invalidCredentialsResponse = { error: "Invalid username or password" };
const protectionUnavailableResponse = {
  error: "Authentication is temporarily unavailable. Try again later.",
};

function requestIp(req: Request) {
  return req.ip ?? req.socket.remoteAddress ?? "unknown-ip";
}

function sessionUser(user: Express.User) {
  return { ...user, isAdmin: isAdminAccount(user.email) };
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export const authController = {
  session(req: Request, res: Response) {
    res.json({ user: req.user ? sessionUser(req.user) : null });
  },

  callback(_req: Request, res: Response) {
    res.redirect(authConfig.frontendUrl);
  },

  async passwordSignup(req: Request, res: Response, next: NextFunction) {
    const decision = await signupAbuseProtectionService.begin(
      requestIp(req),
      req.body?.username,
    );
    if (decision.delayMs > 0) await delay(decision.delayMs);
    if (decision.protectionUnavailable) {
      res.setHeader(
        "Retry-After",
        String(decision.retryAfterSeconds ?? PROTECTION_UNAVAILABLE_RETRY_AFTER_SECONDS),
      );
      res.status(503).json(protectionUnavailableResponse);
      return;
    }
    if (!decision.allowed) {
      res.setHeader(
        "Retry-After",
        String(decision.retryAfterSeconds ?? PROTECTION_UNAVAILABLE_RETRY_AFTER_SECONDS),
      );
      res.status(429).json({ error: "Too many signup attempts. Try again later." });
      return;
    }

    const parsed = passwordSignupSchema.safeParse(req.body);
    if (!parsed.success) {
      await signupAbuseProtectionService.recordFailure(decision.attempt);
      res.status(400).json({ error: "Invalid account details", issues: parsed.error.issues });
      return;
    }

    try {
      const user = await credentialAuthService.register(parsed.data);
      void authTokenService.requestEmailVerification(user.email).catch(() => {
        console.warn("auth.email_verification.delivery_failed");
      });
      req.login(user, (error) => {
        if (error) return next(error);
        void signupAbuseProtectionService.recordSuccess(decision.attempt);
        res.status(201).json({ user: sessionUser(user) });
      });
    } catch (error) {
      if (error instanceof CredentialAlreadyExistsError) {
        await signupAbuseProtectionService.recordFailure(decision.attempt);
        res.status(409).json({ error: error.message });
        return;
      }
      next(error);
    }
  },

  async forgotPassword(req: Request, res: Response) {
    const decision = await authRecoveryAbuseProtectionService.begin(
      requestIp(req),
      req.body?.email,
    );
    if (decision.delayMs > 0) await delay(decision.delayMs);
    if (decision.protectionUnavailable) {
      res.setHeader(
        "Retry-After",
        String(decision.retryAfterSeconds ?? PROTECTION_UNAVAILABLE_RETRY_AFTER_SECONDS),
      );
      res.status(503).json(protectionUnavailableResponse);
      return;
    }
    if (!decision.allowed) {
      res.setHeader(
        "Retry-After",
        String(decision.retryAfterSeconds ?? PROTECTION_UNAVAILABLE_RETRY_AFTER_SECONDS),
      );
      res.status(429).json({ error: "Too many recovery requests. Try again later." });
      return;
    }

    const parsed = emailRequestSchema.safeParse(req.body);
    if (parsed.success) {
      await authTokenService.requestPasswordReset(parsed.data.email).catch(() => {
        console.warn("auth.password_reset.delivery_failed");
      });
      await authRecoveryAbuseProtectionService.recordSuccess(decision.attempt);
    } else {
      await authRecoveryAbuseProtectionService.recordFailure(decision.attempt);
    }
    res.status(202).json({ message: "If that account can be recovered, a reset link will be sent." });
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid or expired password reset link" });
      return;
    }
    try {
      const reset = await authTokenService.resetPassword(parsed.data.token, parsed.data.password);
      if (!reset) {
        res.status(400).json({ error: "Invalid or expired password reset link" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    const parsed = tokenSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid or expired email verification link" });
      return;
    }
    try {
      const verified = await authTokenService.verifyEmail(parsed.data.token);
      if (!verified) {
        res.status(400).json({ error: "Invalid or expired email verification link" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async resendVerification(req: Request, res: Response) {
    const decision = await authRecoveryAbuseProtectionService.begin(
      requestIp(req),
      req.body?.email,
    );
    if (decision.delayMs > 0) await delay(decision.delayMs);
    if (decision.protectionUnavailable) {
      res.setHeader(
        "Retry-After",
        String(decision.retryAfterSeconds ?? PROTECTION_UNAVAILABLE_RETRY_AFTER_SECONDS),
      );
      res.status(503).json(protectionUnavailableResponse);
      return;
    }
    if (!decision.allowed) {
      res.setHeader(
        "Retry-After",
        String(decision.retryAfterSeconds ?? PROTECTION_UNAVAILABLE_RETRY_AFTER_SECONDS),
      );
      res.status(429).json({ error: "Too many recovery requests. Try again later." });
      return;
    }

    const parsed = emailRequestSchema.safeParse(req.body);
    if (parsed.success) {
      await authTokenService.requestEmailVerification(parsed.data.email).catch(() => {
        console.warn("auth.email_verification.delivery_failed");
      });
      await authRecoveryAbuseProtectionService.recordSuccess(decision.attempt);
    } else {
      await authRecoveryAbuseProtectionService.recordFailure(decision.attempt);
    }
    res.status(202).json({ message: "If verification is available, an email will be sent." });
  },

  async passwordLogin(req: Request, res: Response, next: NextFunction) {
    const decision = await loginAbuseProtectionService.begin(
      requestIp(req),
      req.body?.username,
    );
    if (decision.delayMs > 0) await delay(decision.delayMs);
    if (decision.protectionUnavailable) {
      res.setHeader(
        "Retry-After",
        String(decision.retryAfterSeconds ?? PROTECTION_UNAVAILABLE_RETRY_AFTER_SECONDS),
      );
      res.status(503).json(protectionUnavailableResponse);
      return;
    }
    if (!decision.allowed) {
      res.setHeader(
        "Retry-After",
        String(decision.retryAfterSeconds ?? PROTECTION_UNAVAILABLE_RETRY_AFTER_SECONDS),
      );
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
        res.json({ user: sessionUser(user) });
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
