ALTER TABLE "GmailConnection"
ADD COLUMN "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "autoSyncIntervalMins" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN "lastAutoSyncAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastAutoSyncError" TEXT;
