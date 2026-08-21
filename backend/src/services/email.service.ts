import nodemailer from "nodemailer";
import { emailConfig, isEmailConfigured } from "../config/email";

const transport = isEmailConfigured
  ? nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.user
        ? { user: emailConfig.user, pass: emailConfig.password }
        : undefined,
    })
  : null;

function link(path: string, token: string) {
  const url = new URL(path, `${emailConfig.frontendUrl.replace(/\/$/, "")}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

async function send(to: string, subject: string, text: string) {
  if (!transport) return false;
  await transport.sendMail({ from: emailConfig.from, to, subject, text });
  return true;
}

export const emailService = {
  isAvailable: isEmailConfigured,

  sendEmailVerification(to: string, token: string) {
    const verificationUrl = link("verify-email", token);
    return send(
      to,
      "Verify your CareerLedger email",
      `Verify your email address by opening this link:\n\n${verificationUrl}\n\nThis link expires in 24 hours.`,
    );
  },

  sendPasswordReset(to: string, token: string) {
    const resetUrl = link("reset-password", token);
    return send(
      to,
      "Reset your CareerLedger password",
      `Reset your password by opening this link:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
    );
  },
};
