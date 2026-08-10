-- Preserve existing database-backed attachments while allowing new objects to live in S3.
ALTER TABLE "ApplicationResume"
  ADD COLUMN "storageKey" TEXT,
  ALTER COLUMN "content" DROP NOT NULL;

CREATE UNIQUE INDEX "ApplicationResume_storageKey_key"
  ON "ApplicationResume"("storageKey");

-- Persist cleanup work so transient S3 failures do not orphan replaced or deleted resumes.
CREATE TABLE "ResumeObjectDeletion" (
  "id" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ResumeObjectDeletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResumeObjectDeletion_storageKey_key"
  ON "ResumeObjectDeletion"("storageKey");
