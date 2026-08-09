-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "resumeVersionId" TEXT;

-- CreateTable
CREATE TABLE "ResumeVersion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResumeVersion_userId_updatedAt_idx" ON "ResumeVersion"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeVersion_userId_name_key" ON "ResumeVersion"("userId", "name");

-- CreateIndex
CREATE INDEX "Application_resumeVersionId_idx" ON "Application"("resumeVersionId");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "ResumeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
