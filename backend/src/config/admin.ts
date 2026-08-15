import "dotenv/config";

export function parseAdminAccountEmails(value: string | undefined) {
  return new Set(
    (value ?? "")
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
