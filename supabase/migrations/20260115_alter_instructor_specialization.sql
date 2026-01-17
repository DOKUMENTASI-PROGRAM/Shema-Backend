-- Migration: Change specialization from text to text[] in instructor_profiles

-- 1. Alter the column type using a casting clause to convert comma-separated strings to arrays
-- Uses regexp_split_to_array to handle optional whitespace after array elements
ALTER TABLE "instructor_profiles"
ALTER COLUMN "specialization" TYPE text[]
USING regexp_split_to_array("specialization", '\s*,\s*');

-- Note: If previous data was null, it remains null. If empty string, it becomes {""}.
-- We might want to handle empty strings becoming empty arrays or nulls?
-- Ideally "specialization" is optional so null is fine.
-- If someone had "", split results in {""}. Arrays of empty strings are probably not desired.
-- Let's cleanup:
UPDATE "instructor_profiles"
SET "specialization" = NULL
WHERE "specialization" = ARRAY[''];
