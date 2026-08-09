import "dotenv/config";
import { authConfig } from "./auth";

export const gmailConfig = {
  clientId: authConfig.googleClientId,
  clientSecret: authConfig.googleClientSecret,
  callbackUrl:
    process.env.GMAIL_CALLBACK_URL ??
    "http://localhost:3000/api/gmail/callback",
  frontendUrl: authConfig.frontendUrl,
  initialMessageLimit: 100,
};

export const isGmailConfigured = Boolean(
  gmailConfig.clientId && gmailConfig.clientSecret,
);
