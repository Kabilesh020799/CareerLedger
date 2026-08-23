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
 *       429:
 *         description: Signup attempt limit reached
 *         headers:
 *           Retry-After: { schema: { type: integer } }
 *       503:
 *         description: Authentication protection is temporarily unavailable
 *         headers:
 *           Retry-After: { schema: { type: integer } }
 */
authRouter.post("/signup", (req, res, next) => {
  if (!authConfig.passwordLoginEnabled) {
    res.status(404).json({ error: "Account signup is unavailable" });
    return;
  }

  authController.passwordSignup(req, res, next);
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Sign in with username and password
 *     description: Applies Redis-backed account and network limits before credential verification. Redis protection outages fail closed without attempting authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string }
 *               password: { type: string, format: password }
 *     responses:
 *       200: { description: Signed in and session created }
 *       401: { description: Invalid credentials }
 *       429:
 *         description: Login attempt limit reached
 *         headers:
 *           Retry-After: { schema: { type: integer } }
 *       503:
 *         description: Authentication protection is temporarily unavailable
 *         headers:
 *           Retry-After: { schema: { type: integer } }
 */
authRouter.post("/login", (req, res, next) => {
  if (!authConfig.passwordLoginEnabled) {
    res.status(404).json({ error: "Password login is unavailable" });
    return;
  }

  authController.passwordLogin(req, res, next);
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request a password reset email
 *     description: Returns a non-disclosing acknowledgement for valid or unknown email addresses. Requests share a Redis account/IP rate limit with verification resends.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email, maxLength: 254 }
 *     responses:
 *       202: { description: Safe acknowledgement }
 *       429:
 *         description: Recovery request limit reached
 *         headers:
 *           Retry-After: { schema: { type: integer } }
 *       503:
 *         description: Authentication protection is temporarily unavailable
 *         headers:
 *           Retry-After: { schema: { type: integer } }
 */
authRouter.post("/forgot-password", authController.forgotPassword);
authRouter.post("/reset-password", authController.resetPassword);
authRouter.post("/verify-email", authController.verifyEmail);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     tags: [Authentication]
 *     summary: Request an email verification resend
 *     description: Returns a non-disclosing acknowledgement and shares a Redis account/IP rate limit with password reset requests.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email, maxLength: 254 }
 *     responses:
 *       202: { description: Safe acknowledgement }
 *       429:
 *         description: Recovery request limit reached
 *         headers:
 *           Retry-After: { schema: { type: integer } }
 *       503:
 *         description: Authentication protection is temporarily unavailable
 *         headers:
 *           Retry-After: { schema: { type: integer } }
 */
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
