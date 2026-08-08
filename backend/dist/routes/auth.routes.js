"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../config/auth");
const passport_1 = require("../config/passport");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.get("/session", auth_controller_1.authController.session);
exports.authRouter.post("/login", (req, res, next) => {
    if (!auth_1.authConfig.passwordLoginEnabled) {
        res.status(404).json({ error: "Password login is unavailable" });
        return;
    }
    auth_controller_1.authController.passwordLogin(req, res, next);
});
exports.authRouter.get("/google", (req, res, next) => {
    if (!auth_1.isGoogleAuthConfigured) {
        res.status(503).json({ error: "Google authentication is not configured" });
        return;
    }
    passport_1.passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});
exports.authRouter.get("/google/callback", (req, res, next) => {
    if (!auth_1.isGoogleAuthConfigured) {
        res.redirect(`${auth_1.authConfig.frontendUrl}/login?error=unavailable`);
        return;
    }
    passport_1.passport.authenticate("google", {
        failureRedirect: `${auth_1.authConfig.frontendUrl}/login?error=oauth`,
    })(req, res, next);
}, auth_controller_1.authController.callback);
exports.authRouter.post("/logout", auth_controller_1.authController.logout);
