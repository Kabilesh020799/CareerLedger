"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGoogleAuthConfigured = exports.authConfig = void 0;
require("dotenv/config");
const isProduction = process.env.NODE_ENV === "production";
function sessionSecret() {
    const configuredSecret = process.env.SESSION_SECRET;
    if (configuredSecret && (!isProduction || configuredSecret.length >= 32)) {
        return configuredSecret;
    }
    if (isProduction) {
        throw new Error("SESSION_SECRET must contain at least 32 characters");
    }
    return "local-development-session-secret-change-before-production";
}
exports.authConfig = {
    frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
    googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL ??
        "http://localhost:3000/api/auth/google/callback",
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    passwordLoginEnabled: process.env.ENABLE_PASSWORD_LOGIN === "true",
    isProduction,
    secureCookie: process.env.COOKIE_SECURE === undefined
        ? isProduction
        : process.env.COOKIE_SECURE === "true",
    sessionSecret: sessionSecret(),
};
exports.isGoogleAuthConfigured = Boolean(exports.authConfig.googleClientId && exports.authConfig.googleClientSecret);
