-- Migration: Fix Preference Validation Function
-- Date: December 24, 2025
-- Purpose: Update validate_preference function to match application data structure (flat validation instead of nested time_range)

CREATE OR REPLACE FUNCTION validate_preference(pref JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    pref IS NULL OR (
      jsonb_typeof(pref) = 'object' AND
      pref ? 'day' AND
      pref ? 'start_time' AND
      pref ? 'end_time' AND
      pref ? 'instructor_id' AND
      pref ? 'selected_at'
    )
  );
END;
$$ LANGUAGE plpgsql;
