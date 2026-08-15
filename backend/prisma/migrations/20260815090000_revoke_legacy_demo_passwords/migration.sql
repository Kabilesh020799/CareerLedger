-- Invalidate passwords that were previously published in source control.
-- Runtime bootstrap can assign operator-provided passwords after this migration.
UPDATE "User"
SET "passwordHash" = NULL
WHERE "username" IN ('demo', 'demo2');
