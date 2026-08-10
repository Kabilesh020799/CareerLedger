CREATE TYPE "WorkMode" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

ALTER TABLE "Application"
ADD COLUMN "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "experienceRequirements" TEXT,
ADD COLUMN "salaryMin" DOUBLE PRECISION,
ADD COLUMN "salaryMax" DOUBLE PRECISION,
ADD COLUMN "salaryCurrency" TEXT,
ADD COLUMN "salaryPeriod" TEXT,
ADD COLUMN "workMode" "WorkMode";
