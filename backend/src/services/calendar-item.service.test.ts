import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  application: { findFirst: vi.fn() },
  calendarItem: { create: vi.fn() },
}));
vi.mock("../config/prisma", () => ({ prisma: prismaMock }));
import { calendarItemService } from "./calendar-item.service";

describe("calendarItemService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a user-owned calendar task", async () => {
    prismaMock.calendarItem.create.mockResolvedValue({ id: "item-1" });
    await calendarItemService.create("user-1", { type: "TASK", title: "Prepare questions", startsAt: new Date("2026-08-20T13:00:00Z") });
    expect(prismaMock.calendarItem.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "user-1", type: "TASK", title: "Prepare questions" }) });
  });

  it("rejects an application link not owned by the user", async () => {
    prismaMock.application.findFirst.mockResolvedValue(null);
    const result = await calendarItemService.create("user-1", { type: "REMINDER", title: "Follow up", startsAt: new Date(), applicationId: "other-app" });
    expect(result).toBeNull();
    expect(prismaMock.calendarItem.create).not.toHaveBeenCalled();
  });
});
