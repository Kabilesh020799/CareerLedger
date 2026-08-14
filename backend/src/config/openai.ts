import "dotenv/config";

function integerSetting(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

export function parseAllowedAccountEmails(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLocaleLowerCase("en-US"))
      .filter(Boolean),
  );
}

/** Optional server-side settings for ambiguous Gmail classification. */
export const openAiConfig = {
  apiKey: process.env.OPENAI_API_KEY?.trim() ?? "",
  allowedAccountEmails: parseAllowedAccountEmails(
    process.env.OPENAI_ALLOWED_ACCOUNT_EMAILS,
  ),
  model: process.env.OPENAI_GMAIL_MODEL?.trim() || "gpt-5-mini",
  confidenceThreshold: Math.min(
    100,
    Math.max(0, integerSetting(process.env.OPENAI_GMAIL_CONFIDENCE_THRESHOLD, 80)),
  ),
  timeoutMs: Math.max(
    1_000,
    integerSetting(process.env.OPENAI_GMAIL_TIMEOUT_MS, 10_000),
  ),
};
