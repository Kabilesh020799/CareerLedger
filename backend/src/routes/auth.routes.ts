import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authConfig, isGoogleAuthConfigured } from "../config/auth";
import { passport } from "../config/passport";

export const authRouter = Router();

authRouter.get("/session", authController.session);

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     tags: [Authentication]
 *     summary: Create a password account
 *     description: Validates unique account details, stores a bcrypt password hash, and starts a server-side session. Separate Redis limits protect username and network signup attempts.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, username, email, password]
 *             properties:
 *               name: { type: string, minLength: 2, maxLength: 80 }
 *               username: { type: string, minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9_-]+$' }
 *               email: { type: string, format: email, maxLength: 254 }
 *               password: { type: string, format: password, minLength: 12, maxLength: 72 }
 *     responses:
 *       201: { description: Account created and session started }
 *       400: { description: Invalid account details }
 *       409: { description: Username or email already registered }
 *       429: { description: Signup attempt limit reached }
 */
authRouter.post("/signup", (req, res, next) => {
  if (!authConfig.passwordLoginEnabled) {
    res.status(404).json({ error: "Account signup is unavailable" });
    return;
  }

  authController.passwordSignup(req, res, next);
});

authRouter.post("/login", (req, res, next) => {
  if (!authConfig.passwordLoginEnabled) {
    res.status(404).json({ error: "Password login is unavailable" });
    return;
  }

  authController.passwordLogin(req, res, next);
});

authRouter.post("/forgot-password", authController.forgotPassword);
authRouter.post("/reset-password", authController.resetPassword);
authRouter.post("/verify-email", authController.verifyEmail);
authRouter.post("/resend-verification", authController.resendVerification);

authRouter.get("/google", (req, res, next) => {
  if (!isGoogleAuthConfigured) {
    res.status(503).json({ error: "Google authentication is not configured" });
    return;
  }

  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

authRouter.get("/google/callback", (req, res, next) => {
  if (!isGoogleAuthConfigured) {
    res.redirect(`${authConfig.frontendUrl}/login?error=unavailable`);
    return;
  }

  passport.authenticate("google", {
    failureRedirect: `${authConfig.frontendUrl}/login?error=oauth`,
  })(req, res, next);
}, authController.callback);

authRouter.post("/logout", authController.logout);
