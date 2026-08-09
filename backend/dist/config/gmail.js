"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGmailConfigured = exports.gmailConfig = void 0;
require("dotenv/config");
const auth_1 = require("./auth");
exports.gmailConfig = {
    clientId: auth_1.authConfig.googleClientId,
    clientSecret: auth_1.authConfig.googleClientSecret,
    callbackUrl: process.env.GMAIL_CALLBACK_URL ??
        "http://localhost:3000/api/gmail/callback",
    frontendUrl: auth_1.authConfig.frontendUrl,
    initialMessageLimit: 100,
};
exports.isGmailConfigured = Boolean(exports.gmailConfig.clientId && exports.gmailConfig.clientSecret);
