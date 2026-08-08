import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { requireAuth } from "./require-auth";

function responseMock() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

describe("requireAuth", () => {
  it("returns 401 for an unauthenticated request", () => {
    const req = {
      isAuthenticated: () => false,
    } as Request;
    const res = responseMock();
    const next = vi.fn() as NextFunction;

    requireAuth(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Authentication required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("continues for an authenticated request with a user", () => {
    const req = {
      isAuthenticated: () => true,
      user: { id: "user-1" },
    } as Request;
    const res = responseMock();
    const next = vi.fn() as NextFunction;

    requireAuth(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
