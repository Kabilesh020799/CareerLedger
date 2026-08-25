CREATE TYPE "SprintStatus" AS ENUM ('ACTIVE', 'CLOSED');

CREATE TABLE "Sprint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "SprintStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Application" ADD COLUMN "sprintId" TEXT;

CREATE INDEX "Sprint_userId_workspaceId_status_sequence_idx" ON "Sprint"("userId", "workspaceId", "status", "sequence");
CREATE INDEX "Sprint_workspaceId_status_sequence_idx" ON "Sprint"("workspaceId", "status", "sequence");
CREATE INDEX "Application_sprintId_createdAt_id_idx" ON "Application"("sprintId", "createdAt", "id");

ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
