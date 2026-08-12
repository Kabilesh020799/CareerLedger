import { createLoginAbuseProtectionService } from "./login-abuse-protection.service";

/** Limits account creation separately from login and retains successful IP pressure. */
export const signupAbuseProtectionService = createLoginAbuseProtectionService(
  undefined,
  undefined,
  {
    scope: "signup",
    accountAttemptLimit: 5,
    ipAttemptLimit: 10,
    clearSuccessfulAttempt: false,
  },
);
