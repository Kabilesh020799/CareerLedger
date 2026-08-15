import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const adminServiceMock = vi.hoisted(() => ({ listUsers: vi.fn() }));
vi.mock("../services/admin.service", () => ({ adminService: adminServiceMock }));

import { adminRouter } from "./admin.routes";

describe("admin API", () => {
  const app = express();
  app.use("/api/admin", adminRouter);

  beforeEach(() => vi.clearAllMocks());

  it("returns validated paginated user data", async () => {
    adminServiceMock.listUsers.mockResolvedValue({ users: [], summary: {}, pagination: {} });
    const response = await request(app).get("/api/admin/users?page=2&pageSize=10&search=alex");
    expect(response.status).toBe(200);
    expect(adminServiceMock.listUsers).toHaveBeenCalledWith({ page: 2, pageSize: 10, search: "alex" });
  });

  it("rejects invalid pagination", async () => {
    const response = await request(app).get("/api/admin/users?page=0");
    expect(response.status).toBe(400);
    expect(adminServiceMock.listUsers).not.toHaveBeenCalled();
  });
});
