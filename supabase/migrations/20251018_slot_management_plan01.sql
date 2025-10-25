-- ============================================
-- Migration: Slot Management System - PLAN 01
-- Date: October 18, 2025
-- Purpose: Database Schema Enhancement for Slot Management
-- ============================================
--
-- Changes:
-- 1. Add first_preference and second_preference JSONB columns to bookings table
-- 2. Add booking_id column to class_schedules table
-- 3. Create indexes for performance
-- 4. Add validation constraints
-- ============================================

-- Step 1: Add preference columns to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS first_preference JSONB,
ADD COLUMN IF NOT EXISTS second_preference JSONB;

-- Step 2: Add booking_id to class_schedules table
ALTER TABLE public.class_schedules
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id);

-- Step 3: Add unique constraint for booking-slot relationship
ALTER TABLE public.class_schedules
ADD CONSTRAINT IF NOT EXISTS unique_booking_slot UNIQUE (booking_id);

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_schedules_instructor_time
ON public.class_schedules (instructor_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_class_schedules_room_time
ON public.class_schedules (room_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_class_schedules_booking
ON public.class_schedules (booking_id);

-- Step 5: Create preference validation function
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

-- Step 6: Add check constraints for preference validation
ALTER TABLE public.bookings
ADD CONSTRAINT IF NOT EXISTS valid_first_preference
CHECK (first_preference IS NULL OR validate_preference(first_preference));

ALTER TABLE public.bookings
ADD CONSTRAINT IF NOT EXISTS valid_second_preference
CHECK (second_preference IS NULL OR validate_preference(second_preference));

-- Step 7: Add comments for documentation
COMMENT ON COLUMN public.bookings.first_preference IS 'First preference combination: {day, start_time, end_time, instructor_id, selected_at}';
COMMENT ON COLUMN public.bookings.second_preference IS 'Second preference combination: {day, start_time, end_time, instructor_id, selected_at}';
COMMENT ON COLUMN public.class_schedules.booking_id IS 'Reference to the booking that created this schedule slot';

-- Step 8: Create room_availability table (optional enhancement)
CREATE TABLE IF NOT EXISTS public.room_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, day_of_week, start_time, end_time)
);

-- Step 9: Create indexes for room_availability
CREATE INDEX IF NOT EXISTS idx_room_availability_room_day
ON public.room_availability (room_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_room_availability_time
ON public.room_availability (start_time, end_time);

-- Step 10: Enable RLS on room_availability
ALTER TABLE public.room_availability ENABLE ROW LEVEL SECURITY;

-- Step 11: Create RLS policy for room_availability
CREATE POLICY "Service can manage room availability" ON public.room_availability
  FOR ALL USING (true);