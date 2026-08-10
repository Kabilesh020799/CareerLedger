ALTER TABLE "Application"
ADD COLUMN "jobDescription" TEXT,
ADD COLUMN "capturedAt" TIMESTAMP(3);

CREATE TABLE "BrowserExtensionToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "tokenPrefix" TEXT NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrowserExtensionToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrowserExtensionToken_tokenHash_key" ON "BrowserExtensionToken"("tokenHash");
CREATE INDEX "BrowserExtensionToken_userId_createdAt_idx" ON "BrowserExtensionToken"("userId", "createdAt");

ALTER TABLE "BrowserExtensionToken"
ADD CONSTRAINT "BrowserExtensionToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
