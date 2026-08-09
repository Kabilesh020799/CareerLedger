-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('FOLLOW_UP', 'DEADLINE');

-- CreateTable
CREATE TABLE "ApplicationReminder" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "description" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationReminder_applicationId_dueAt_idx" ON "ApplicationReminder"("applicationId", "dueAt");

-- CreateIndex
CREATE INDEX "ApplicationReminder_completedAt_dueAt_idx" ON "ApplicationReminder"("completedAt", "dueAt");

-- AddForeignKey
ALTER TABLE "ApplicationReminder" ADD CONSTRAINT "ApplicationReminder_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
