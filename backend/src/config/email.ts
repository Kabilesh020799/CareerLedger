import "dotenv/config";

const port = Number(process.env.SMTP_PORT) || 587;

export const emailConfig = {
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  host: process.env.SMTP_HOST?.trim() ?? "",
  port,
  secure: port === 465,
  user: process.env.SMTP_USER?.trim() ?? "",
  password: process.env.SMTP_PASSWORD ?? "",
  from: process.env.SMTP_FROM?.trim() ?? "",
};

export const isEmailConfigured = Boolean(emailConfig.host && emailConfig.from);
