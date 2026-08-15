import { describe, expect, it, vi } from "vitest";

vi.mock("../config/admin", () => ({
  isAdminAccount: (email: string) => email === "admin@example.com",
}));

import { requireAdmin } from "./require-admin";

describe("requireAdmin", () => {
  it("allows a configured administrator", () => {
    const next = vi.fn();
    const req = { user: { email: "admin@example.com" } };
    requireAdmin(req as never, {} as never, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 403 for another authenticated account", () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const next = vi.fn();
    requireAdmin(
      { user: { email: "user@example.com" } } as never,
      { status } as never,
      next,
    );
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "Administrator access required" });
    expect(next).not.toHaveBeenCalled();
  });
});
