-- Drop exclusion constraint on instructor time overlap if it exists
-- This allows an instructor to have multiple schedules at the same time (in different rooms)
-- We strictly rely on the application logic to manage availability

-- Note: we keep 'unique_schedule_slot' because it includes room_id, 
-- ensuring we don't accidentally create duplicate rows for the EXACT SAME schedule.

-- Try to drop potential exclusion constraints (names might vary, so we handle safely)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_schedules_instructor_id_excl') THEN
        ALTER TABLE class_schedules DROP CONSTRAINT class_schedules_instructor_id_excl;
    END IF;
END $$;

-- If there was a unique index purely on (instructor_id, day, start_time, end_time), we should drop it.
-- Based on inspection, we only saw 'unique_schedule_slot' (includes room) and 'idx_class_schedules_instructor_time' (GiST).
-- A GiST index itself enforces nothing unless used in an EXCLUDE constraint. 
-- If 'idx_class_schedules_instructor_time' is just an index, it's fine.
