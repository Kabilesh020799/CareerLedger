import { describe, expect, it, vi } from "vitest";
import { builtInDemoUsers } from "./config/demo-user";
import { bootstrapBuiltInDemoUsers } from "./services/demo-user-bootstrap.service";

describe("built-in demo user bootstrap", () => {
  it("hashes the documented passwords and upserts both demo accounts", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "demo-user" });
    const passwordHasher = vi.fn().mockResolvedValue("bcrypt-password-hash");

    await bootstrapBuiltInDemoUsers({ user: { upsert } }, passwordHasher);

    expect(passwordHasher).toHaveBeenCalledTimes(2);
    expect(passwordHasher).toHaveBeenNthCalledWith(1, builtInDemoUsers[0].password, 12);
    expect(passwordHasher).toHaveBeenNthCalledWith(2, builtInDemoUsers[1].password, 12);
    expect(upsert).toHaveBeenNthCalledWith(1, {
      where: { username: builtInDemoUsers[0].username },
      create: {
        username: builtInDemoUsers[0].username,
        passwordHash: "bcrypt-password-hash",
        email: "demo@jobtracker.invalid",
        name: builtInDemoUsers[0].username,
      },
      update: { passwordHash: "bcrypt-password-hash" },
    });
    expect(upsert).toHaveBeenNthCalledWith(2, {
      where: { username: builtInDemoUsers[1].username },
      create: {
        username: builtInDemoUsers[1].username,
        passwordHash: "bcrypt-password-hash",
        email: "demo2@jobtracker.invalid",
        name: builtInDemoUsers[1].username,
      },
      update: { passwordHash: "bcrypt-password-hash" },
    });
  });
});
