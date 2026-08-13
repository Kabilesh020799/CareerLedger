CREATE TYPE "CalendarItemType" AS ENUM ('TASK', 'EVENT', 'REMINDER');

CREATE TABLE "CalendarItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "applicationId" TEXT,
  "type" "CalendarItemType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CalendarItem_userId_startsAt_idx" ON "CalendarItem"("userId", "startsAt");
CREATE INDEX "CalendarItem_applicationId_idx" ON "CalendarItem"("applicationId");
ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarItem" ADD CONSTRAINT "CalendarItem_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
