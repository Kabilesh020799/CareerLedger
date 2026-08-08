import { afterEach, describe, expect, it, vi } from "vitest";

describe("password authentication configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("can be explicitly enabled in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_PASSWORD_LOGIN", "true");
    vi.stubEnv("SESSION_SECRET", "a-secure-production-session-secret-value");

    const { authConfig } = await import("./auth");

    expect(authConfig.passwordLoginEnabled).toBe(true);
  });
});
