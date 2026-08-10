-- CreateEnum
CREATE TYPE "GmailUpdateReviewStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IGNORED');

-- AlterTable
ALTER TABLE "GmailMessage" ADD COLUMN "processedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GmailUpdateReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "applicationId" TEXT,
    "suggestedStatus" "ApplicationStatus" NOT NULL,
    "suggestedCompany" TEXT,
    "suggestedJobTitle" TEXT,
    "subject" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "matchConfidence" INTEGER NOT NULL,
    "status" "GmailUpdateReviewStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GmailUpdateReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GmailUpdateReview_gmailMessageId_key" ON "GmailUpdateReview"("gmailMessageId");

-- CreateIndex
CREATE INDEX "GmailUpdateReview_userId_status_createdAt_idx" ON "GmailUpdateReview"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "GmailUpdateReview_applicationId_idx" ON "GmailUpdateReview"("applicationId");

-- AddForeignKey
ALTER TABLE "GmailUpdateReview" ADD CONSTRAINT "GmailUpdateReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GmailUpdateReview" ADD CONSTRAINT "GmailUpdateReview_gmailMessageId_fkey" FOREIGN KEY ("gmailMessageId") REFERENCES "GmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GmailUpdateReview" ADD CONSTRAINT "GmailUpdateReview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
