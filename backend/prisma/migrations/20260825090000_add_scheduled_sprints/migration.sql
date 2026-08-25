ALTER TYPE "SprintStatus" ADD VALUE 'SCHEDULED';

ALTER TABLE "Sprint" ADD COLUMN "scheduledStartAt" TIMESTAMP(3);

CREATE INDEX "Sprint_userId_workspaceId_status_scheduledStartAt_idx"
  ON "Sprint"("userId", "workspaceId", "status", "scheduledStartAt");
