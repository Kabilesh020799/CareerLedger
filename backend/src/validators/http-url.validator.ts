import { z } from "zod";

export function isHttpOrHttpsUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export const httpOrHttpsUrlSchema = z
  .url("URL must be a valid HTTP or HTTPS URL")
  .refine(isHttpOrHttpsUrl, {
    message: "URL must be a valid HTTP or HTTPS URL",
  });
