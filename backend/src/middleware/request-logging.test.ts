import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { bindAuthenticatedLogContext } from "./request-logging";

describe("authenticated request log context", () => {
  it("binds the authenticated user ID without adding profile data", () => {
    const child = vi.fn().mockReturnValue({ info: vi.fn() });
    const req = {
      user: { id: "user-1" },
      log: { child },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    bindAuthenticatedLogContext(req, res, next);

    expect(child).toHaveBeenCalledWith({ userId: "user-1" });
    expect(res.log).toBe(req.log);
    expect(next).toHaveBeenCalledOnce();
  });
});
