import { describe, expect, it, vi } from "vitest";
import { createLoginAbuseProtectionService } from "./login-abuse-protection.service";

function setup(result: unknown = [1, 1, 900, 900]) {
  const client = {
    status: "ready",
    connect: vi.fn(),
    eval: vi.fn().mockResolvedValue(result),
    del: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
  };
  const audit = vi.fn();
  return {
    audit,
    client,
    service: createLoginAbuseProtectionService(() => client as never, audit),
  };
}

describe("loginAbuseProtectionService", () => {
  it("counts account and IP attempts without putting raw identifiers in Redis keys", async () => {
    const { client, service } = setup([2, 5, 850, 870]);

    const decision = await service.begin("203.0.113.10", "Person@Example.com");

    expect(decision.allowed).toBe(true);
    expect(decision.delayMs).toBe(150);
    expect(client.eval).toHaveBeenCalledWith(
      expect.any(String),
      2,
      expect.stringMatching(/^auth:login:account:[a-f0-9]{16}$/),
      expect.stringMatching(/^auth:login:ip:[a-f0-9]{16}$/),
      900,
    );
    expect(JSON.stringify(client.eval.mock.calls)).not.toContain("Person@Example.com");
    expect(JSON.stringify(client.eval.mock.calls)).not.toContain("203.0.113.10");
  });

  it("temporarily blocks an account after the allowed attempts", async () => {
    const { service } = setup([9, 9, 640, 700]);

    const decision = await service.begin("203.0.113.10", "demo");

    expect(decision).toMatchObject({
      allowed: false,
      delayMs: 1_200,
      retryAfterSeconds: 640,
    });
  });

  it("temporarily blocks an abusive IP across account names", async () => {
    const { service } = setup([1, 31, 800, 420]);

    const decision = await service.begin("203.0.113.10", "another-user");

    expect(decision).toMatchObject({
      allowed: false,
      retryAfterSeconds: 420,
    });
  });

  it("removes a successful attempt from the account and shared IP pressure", async () => {
    const { client, service } = setup();
    const decision = await service.begin("203.0.113.10", "demo");

    await service.recordSuccess(decision.attempt);

    expect(client.eval).toHaveBeenLastCalledWith(
      expect.stringContaining('redis.call("DECR", KEYS[2])'),
      2,
      decision.attempt.accountKey,
      decision.attempt.ipKey,
    );
  });

  it("supports separate signup limits and retains successful attempt pressure", async () => {
    const { client, audit } = setup();
    const service = createLoginAbuseProtectionService(
      () => client as never,
      audit,
      {
        scope: "signup",
        accountAttemptLimit: 5,
        ipAttemptLimit: 10,
        clearSuccessfulAttempt: false,
      },
    );

    const decision = await service.begin("203.0.113.10", "new-user");
    await service.recordSuccess(decision.attempt);

    expect(decision.attempt.accountKey).toMatch(/^auth:signup:account:/);
    expect(decision.attempt.ipKey).toMatch(/^auth:signup:ip:/);
    expect(client.eval).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledWith("auth.signup.succeeded", expect.any(Object));
  });

  it("fails closed with a sanitized event when Redis is unavailable", async () => {
    const failingClient = {
      status: "ready",
      connect: vi.fn(),
      eval: vi.fn().mockRejectedValue(new Error("redis secret details")),
      del: vi.fn(),
      on: vi.fn(),
    };
    const audit = vi.fn();
    const protectedService = createLoginAbuseProtectionService(
      () => failingClient as never,
      audit,
    );

    const decision = await protectedService.begin("203.0.113.10", "demo");

    expect(decision).toMatchObject({
      allowed: false,
      protectionUnavailable: true,
      retryAfterSeconds: 30,
    });
    expect(audit).toHaveBeenCalledWith(
      "auth.login.protection_unavailable",
      expect.objectContaining({
        accountReference: expect.stringMatching(/^[a-f0-9]{16}$/),
        ipReference: expect.stringMatching(/^[a-f0-9]{16}$/),
      }),
    );
    expect(JSON.stringify(audit.mock.calls)).not.toContain("redis secret details");
  });
});
