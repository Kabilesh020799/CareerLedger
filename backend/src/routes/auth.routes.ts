import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authConfig, isGoogleAuthConfigured } from "../config/auth";
import { passport } from "../config/passport";

export const authRouter = Router();

authRouter.get("/session", authController.session);

authRouter.post("/login", (req, res, next) => {
  if (!authConfig.passwordLoginEnabled) {
    res.status(404).json({ error: "Password login is unavailable" });
    return;
  }

  authController.passwordLogin(req, res, next);
});

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
