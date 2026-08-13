-- Account verification and recovery
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN "userId" TEXT;
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

CREATE TABLE "EmailVerificationToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx" ON "EmailVerificationToken"("userId", "expiresAt");
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Personal and shared workspaces
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
CREATE TABLE "Workspace" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isPersonal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkspaceMember" (
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "WorkspaceRole" NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("workspaceId", "userId")
);
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");
CREATE TABLE "WorkspaceInvitation" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "emailNormalized" TEXT NOT NULL,
  "role" "WorkspaceRole" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkspaceInvitation_tokenHash_key" ON "WorkspaceInvitation"("tokenHash");
CREATE INDEX "WorkspaceInvitation_workspaceId_emailNormalized_idx" ON "WorkspaceInvitation"("workspaceId", "emailNormalized");
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Application" ADD COLUMN "workspaceId" TEXT;
CREATE INDEX "Application_workspaceId_updatedAt_idx" ON "Application"("workspaceId", "updatedAt");
ALTER TABLE "Application" ADD CONSTRAINT "Application_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill a personal workspace for every user and attach their existing applications.
INSERT INTO "Workspace" ("id", "name", "isPersonal", "createdAt", "updatedAt")
SELECT 'personal_' || "id", COALESCE(NULLIF("name", ''), NULLIF("username", ''), 'Personal') || '''s workspace', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User";
INSERT INTO "WorkspaceMember" ("workspaceId", "userId", "role", "joinedAt")
SELECT 'personal_' || "id", "id", 'OWNER'::"WorkspaceRole", CURRENT_TIMESTAMP FROM "User";
UPDATE "Application" SET "workspaceId" = 'personal_' || "userId" WHERE "userId" IS NOT NULL;

-- Revocable secret calendar feeds
CREATE TABLE "CalendarFeedToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarFeedToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CalendarFeedToken_tokenHash_key" ON "CalendarFeedToken"("tokenHash");
CREATE INDEX "CalendarFeedToken_userId_createdAt_idx" ON "CalendarFeedToken"("userId", "createdAt");
ALTER TABLE "CalendarFeedToken" ADD CONSTRAINT "CalendarFeedToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
