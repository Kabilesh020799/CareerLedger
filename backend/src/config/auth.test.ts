import { afterEach, describe, expect, it, vi } from "vitest";

describe("demo authentication configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("cannot be enabled in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_DEMO_LOGIN", "true");
    vi.stubEnv("SESSION_SECRET", "a-secure-production-session-secret-value");

    const { authConfig } = await import("./auth");

    expect(authConfig.demoLoginEnabled).toBe(false);
  });
});
