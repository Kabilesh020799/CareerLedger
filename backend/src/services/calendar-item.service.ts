import { prisma } from "../config/prisma";
import type { CreateCalendarItemInput } from "../validators/calendar-item.validator";
import { applicationAccess } from "./workspace-access.service";

export const calendarItemService = {
  async create(userId: string, input: CreateCalendarItemInput, workspaceId?: string) {
    if (input.applicationId) {
      const access = await applicationAccess(userId, workspaceId, true);
      const application = await prisma.application.findFirst({ where: { ...access.where, id: input.applicationId }, select: { id: true } });
      if (!application) return null;
    }
    return prisma.calendarItem.create({
      data: { ...input, description: input.description || null, applicationId: input.applicationId || null, userId },
    });
  },
};
