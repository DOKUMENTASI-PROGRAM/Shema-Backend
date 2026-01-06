-- ============================================
-- Migration: Fix Constraints for Subscription Booking Model
-- Date: December 24, 2025
-- Purpose: Replace old timestamp-based exclusion constraints 
--          with day_of_week + time based constraints
-- ============================================

-- Step 1: Drop old exclusion constraints that use tstzrange(start_time, end_time)
-- These conflict with subscription model where we use placeholder dates
ALTER TABLE public.class_schedules DROP CONSTRAINT IF EXISTS class_schedules_room_id_tstzrange_excl;
ALTER TABLE public.class_schedules DROP CONSTRAINT IF EXISTS no_overlap_instructor;
ALTER TABLE public.class_schedules DROP CONSTRAINT IF EXISTS no_overlap_room;

-- Step 2: Make legacy timestamp columns nullable
ALTER TABLE public.class_schedules ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE public.class_schedules ALTER COLUMN end_time DROP NOT NULL;

-- Step 3: Create unique constraint for subscription model
-- Prevent duplicate schedules: same day + time + instructor + room
ALTER TABLE public.class_schedules 
ADD CONSTRAINT unique_schedule_slot 
UNIQUE (day_of_week, start_time_of_day, end_time_of_day, instructor_id, room_id);

-- Step 4: Add comments for documentation
COMMENT ON CONSTRAINT unique_schedule_slot ON public.class_schedules IS 
'Prevents duplicate schedule slots: same day + time + instructor + room combination';

COMMENT ON COLUMN public.class_schedules.start_time IS 'DEPRECATED: Legacy timestamp field. Use start_time_of_day instead.';
COMMENT ON COLUMN public.class_schedules.end_time IS 'DEPRECATED: Legacy timestamp field. Use end_time_of_day instead.';

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '✅ Constraints fixed for subscription booking model!';
  RAISE NOTICE 'Dropped: class_schedules_room_id_tstzrange_excl, no_overlap_instructor, no_overlap_room';
  RAISE NOTICE 'Created: unique_schedule_slot (day_of_week, start_time_of_day, end_time_of_day, instructor_id, room_id)';
  RAISE NOTICE 'Made nullable: start_time, end_time (legacy fields)';
END $$;
