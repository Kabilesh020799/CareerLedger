CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP INDEX IF EXISTS "Application_userId_appliedAt_idx";
DROP INDEX IF EXISTS "Application_userId_company_idx";
DROP INDEX IF EXISTS "Application_userId_createdAt_idx";
DROP INDEX IF EXISTS "Application_userId_status_idx";
DROP INDEX IF EXISTS "Application_userId_updatedAt_idx";
DROP INDEX IF EXISTS "Application_workspaceId_updatedAt_idx";

CREATE INDEX "Application_userId_appliedAt_id_idx"
  ON "Application"("userId", "appliedAt", "id");
CREATE INDEX "Application_userId_company_id_idx"
  ON "Application"("userId", "company", "id");
CREATE INDEX "Application_userId_createdAt_id_idx"
  ON "Application"("userId", "createdAt", "id");
CREATE INDEX "Application_userId_status_createdAt_id_idx"
  ON "Application"("userId", "status", "createdAt", "id");
CREATE INDEX "Application_userId_updatedAt_id_idx"
  ON "Application"("userId", "updatedAt", "id");
CREATE INDEX "Application_workspaceId_appliedAt_id_idx"
  ON "Application"("workspaceId", "appliedAt", "id");
CREATE INDEX "Application_workspaceId_company_id_idx"
  ON "Application"("workspaceId", "company", "id");
CREATE INDEX "Application_workspaceId_createdAt_id_idx"
  ON "Application"("workspaceId", "createdAt", "id");
CREATE INDEX "Application_workspaceId_status_createdAt_id_idx"
  ON "Application"("workspaceId", "status", "createdAt", "id");
CREATE INDEX "Application_workspaceId_updatedAt_id_idx"
  ON "Application"("workspaceId", "updatedAt", "id");

CREATE INDEX "Application_company_trgm_idx"
  ON "Application" USING GIN ("company" gin_trgm_ops);
CREATE INDEX "Application_jobTitle_trgm_idx"
  ON "Application" USING GIN ("jobTitle" gin_trgm_ops);
CREATE INDEX "Application_location_trgm_idx"
  ON "Application" USING GIN ("location" gin_trgm_ops);
CREATE INDEX "Application_source_trgm_idx"
  ON "Application" USING GIN ("source" gin_trgm_ops);
