CREATE TABLE "ApplicationCoverLetter" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "content" BYTEA,
    "storageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApplicationCoverLetter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApplicationCoverLetter_applicationId_key" ON "ApplicationCoverLetter"("applicationId");
CREATE UNIQUE INDEX "ApplicationCoverLetter_storageKey_key" ON "ApplicationCoverLetter"("storageKey");
ALTER TABLE "ApplicationCoverLetter" ADD CONSTRAINT "ApplicationCoverLetter_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
