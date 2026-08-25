ALTER TABLE "Sprint" ADD COLUMN "durationDays" INTEGER;
ALTER TABLE "Sprint" ADD COLUMN "endsAt" TIMESTAMP(3);

UPDATE "Sprint"
SET "durationDays" = 14,
    "endsAt" = "startedAt" + INTERVAL '14 days'
WHERE "durationDays" IS NULL OR "endsAt" IS NULL;

ALTER TABLE "Sprint" ALTER COLUMN "durationDays" SET NOT NULL;
ALTER TABLE "Sprint" ALTER COLUMN "endsAt" SET NOT NULL;
