ALTER TABLE "User"
ALTER COLUMN "googleId" DROP NOT NULL,
ADD COLUMN "username" TEXT,
ADD COLUMN "passwordHash" TEXT;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
