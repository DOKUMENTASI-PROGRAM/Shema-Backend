-- Fix unique_schedule_slot to support soft deletes
-- Previous constraint blocked entering new schedules if a deleted one existed in the same slot.

-- Drop the constraint first (which implicitly drops the index if it was created by the constraint)
ALTER TABLE class_schedules DROP CONSTRAINT IF EXISTS unique_schedule_slot;
-- Ensure index is gone just in case
DROP INDEX IF EXISTS unique_schedule_slot;

-- Create a new partial unique index that only enforces uniqueness for active (non-deleted) schedules
CREATE UNIQUE INDEX unique_schedule_slot 
ON class_schedules (room_id, day_of_week, start_time_of_day, end_time_of_day) 
WHERE deleted_at IS NULL;
