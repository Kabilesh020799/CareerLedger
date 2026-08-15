import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DEMO_USER_USERNAME = "first_demo";
  process.env.DEMO_USER_PASSWORD = "FirstTestPassword1";
  process.env.DEMO_USER_EMAIL = "first-demo@example.invalid";
  process.env.DEMO_USER_NAME = "First Demo";
  process.env.DEMO_USER_2_USERNAME = "second_demo";
  process.env.DEMO_USER_2_PASSWORD = "SecondTestPassword2";
  process.env.DEMO_USER_2_EMAIL = "second-demo@example.invalid";
  process.env.DEMO_USER_2_NAME = "Second Demo";
});

import { configuredDemoUsers } from "./config/demo-user";
import { bootstrapConfiguredDemoUsers } from "./services/demo-user-bootstrap.service";

describe("configured demo user bootstrap", () => {
  it("hashes environment passwords and upserts configured demo accounts", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "demo-user" });
    const passwordHasher = vi.fn().mockResolvedValue("bcrypt-password-hash");

    await bootstrapConfiguredDemoUsers({ user: { upsert } }, passwordHasher);

    expect(passwordHasher).toHaveBeenCalledTimes(2);
    expect(passwordHasher).toHaveBeenNthCalledWith(1, configuredDemoUsers[0].password, 12);
    expect(passwordHasher).toHaveBeenNthCalledWith(2, configuredDemoUsers[1].password, 12);
    expect(upsert).toHaveBeenNthCalledWith(1, {
      where: { username: "first_demo" },
      create: {
        username: "first_demo",
        passwordHash: "bcrypt-password-hash",
        email: "first-demo@example.invalid",
        name: "First Demo",
      },
      update: {
        passwordHash: "bcrypt-password-hash",
        email: "first-demo@example.invalid",
        name: "First Demo",
      },
    });
    expect(upsert).toHaveBeenNthCalledWith(2, {
      where: { username: "second_demo" },
      create: {
        username: "second_demo",
        passwordHash: "bcrypt-password-hash",
        email: "second-demo@example.invalid",
        name: "Second Demo",
      },
      update: {
        passwordHash: "bcrypt-password-hash",
        email: "second-demo@example.invalid",
        name: "Second Demo",
      },
    });
  });
});
