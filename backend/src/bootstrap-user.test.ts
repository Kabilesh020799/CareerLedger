import { describe, expect, it, vi } from "vitest";
import { builtInDemoUser } from "./config/demo-user";
import { bootstrapBuiltInDemoUser } from "./services/demo-user-bootstrap.service";

describe("built-in demo user bootstrap", () => {
  it("hashes the documented password and upserts the demo account", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "demo-user" });
    const passwordHasher = vi.fn().mockResolvedValue("bcrypt-password-hash");

    await bootstrapBuiltInDemoUser({ user: { upsert } }, passwordHasher);

    expect(passwordHasher).toHaveBeenCalledWith(builtInDemoUser.password, 12);
    expect(upsert).toHaveBeenCalledWith({
      where: { username: builtInDemoUser.username },
      create: {
        username: builtInDemoUser.username,
        passwordHash: "bcrypt-password-hash",
        email: "demo@jobtracker.invalid",
        name: builtInDemoUser.username,
      },
      update: { passwordHash: "bcrypt-password-hash" },
    });
  });
});
