"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_1 = require("../config/auth");
const credential_auth_service_1 = require("../services/credential-auth.service");
const auth_validator_1 = require("../validators/auth.validator");
exports.authController = {
    session(req, res) {
        res.json({ user: req.user ?? null });
    },
    callback(_req, res) {
        res.redirect(auth_1.authConfig.frontendUrl);
    },
    async passwordLogin(req, res, next) {
        const parsed = auth_validator_1.passwordLoginSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                error: "Invalid login data",
                details: parsed.error.flatten(),
            });
            return;
        }
        try {
            const user = await credential_auth_service_1.credentialAuthService.authenticate(parsed.data);
            if (!user) {
                res.status(401).json({ error: "Invalid username or password" });
                return;
            }
            req.login(user, (error) => {
                if (error)
                    return next(error);
                res.json({ user });
            });
        }
        catch (error) {
            next(error);
        }
    },
    logout(req, res, next) {
        req.logout((logoutError) => {
            if (logoutError)
                return next(logoutError);
            req.session.destroy((sessionError) => {
                if (sessionError)
                    return next(sessionError);
                res.clearCookie("job-tracker-session", {
                    httpOnly: true,
                    sameSite: "lax",
                    secure: auth_1.authConfig.secureCookie,
                });
                res.status(204).send();
            });
        });
    },
};
