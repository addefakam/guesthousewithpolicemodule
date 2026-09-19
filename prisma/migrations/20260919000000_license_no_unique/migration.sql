-- Migration: license_no_unique
-- Date: 2026-09-19
--
-- Purpose: make Provider.licenseNo REQUIRED + UNIQUE.
--
-- Background:
--   Previously licenseNo had a default of "" and was NOT unique. Existing
--   providers may have an empty licenseNo value, which would violate the
--   new UNIQUE constraint (multiple rows with the same "" value).
--
-- Strategy:
--   1. For each existing provider with an empty (or NULL) licenseNo,
--      set it to a unique placeholder "LEGACY-{id}" so the unique constraint
--      can be added without breaking. These legacy providers should be
--      updated by an admin to their real license numbers later.
--   2. Add the UNIQUE constraint on "licenseNo".
--   3. Note: the column was already NOT NULL with a default, so we don't
--      need to change nullability — but we DO need to drop the DEFAULT ""
--      going forward (Prisma will handle that via db push, since the schema
--      no longer declares a default).

-- Step 1: Backfill empty licenseNo values with unique placeholders.
UPDATE "Provider"
SET "licenseNo" = CONCAT('LEGACY-', "id")
WHERE "licenseNo" = '' OR "licenseNo" IS NULL;

-- Step 2: Add the UNIQUE constraint.
-- Using CREATE UNIQUE INDEX IF NOT EXISTS so re-running this migration
-- is safe (idempotent). Prisma's db push will later also create the
-- proper constraint, but we want to make sure it succeeds even on the
-- first run with existing data.
CREATE UNIQUE INDEX IF NOT EXISTS "Provider_licenseNo_key"
  ON "Provider" ("licenseNo");
