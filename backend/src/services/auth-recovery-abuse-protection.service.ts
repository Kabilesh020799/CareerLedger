import { createLoginAbuseProtectionService } from "./login-abuse-protection.service";

/** Shares one short-lived account/IP budget across password reset and verification email delivery. */
export const authRecoveryAbuseProtectionService = createLoginAbuseProtectionService(
  undefined,
  undefined,
  {
    scope: "recovery",
    accountAttemptLimit: 3,
    ipAttemptLimit: 10,
    clearSuccessfulAttempt: false,
  },
);
