import "dotenv/config";
import { firstConfiguredDemoUser } from "./demo-user";

export const defaultAdminAccountEmail = firstConfiguredDemoUser?.email ?? "";

export function parseAdminAccountEmails(
  value: string | undefined,
  fallback = defaultAdminAccountEmail,
) {
  return new Set(
    (value?.trim() || fallback)
      .split(",")
      .map((email) => email.trim().toLocaleLowerCase("en-US"))
      .filter(Boolean),
  );
}

export const adminAccountEmails = parseAdminAccountEmails(
  process.env.ADMIN_ACCOUNT_EMAILS,
);

/** Returns whether an application login email has administrator access. */
export function isAdminAccount(email: string) {
  return adminAccountEmails.has(email.trim().toLocaleLowerCase("en-US"));
}

/** Prevents public identity providers from provisioning reserved administrators. */
export function isUnprovisionedAdminAccount(email: string, accountExists: boolean) {
  return !accountExists && isAdminAccount(email);
}
