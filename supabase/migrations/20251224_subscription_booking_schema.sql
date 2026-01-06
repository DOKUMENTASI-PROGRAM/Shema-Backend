-- ============================================
-- Migration: Subscription Booking System
-- Date: December 24, 2025
-- Purpose: Convert from date-range based scheduling to subscription/permanent booking
-- ============================================
--
-- Changes:
-- 1. Add day_of_week column to class_schedules
-- 2. Add max_students column to class_schedules
-- 3. Add start_time_of_day and end_time_of_day TIME columns
-- 4. Create schedule_enrollments table for many-to-many relationship
-- 5. Add function to count current enrollments
-- ============================================

-- Step 1: Add new columns to class_schedules (additive for backward compatibility)
ALTER TABLE public.class_schedules
ADD COLUMN IF NOT EXISTS day_of_week VARCHAR(10),
ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 1 CHECK (max_students >= 1),
ADD COLUMN IF NOT EXISTS start_time_of_day TIME,
ADD COLUMN IF NOT EXISTS end_time_of_day TIME;

-- Step 2: Create schedule_enrollments table for multi-booking per schedule
CREATE TABLE IF NOT EXISTS public.schedule_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(schedule_id, booking_id)
);

-- Step 3: Create indexes for schedule_enrollments
CREATE INDEX IF NOT EXISTS idx_schedule_enrollments_schedule_id 
ON public.schedule_enrollments(schedule_id);

CREATE INDEX IF NOT EXISTS idx_schedule_enrollments_booking_id 
ON public.schedule_enrollments(booking_id);

CREATE INDEX IF NOT EXISTS idx_schedule_enrollments_status 
ON public.schedule_enrollments(status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_class_schedules_day_time 
ON public.class_schedules(day_of_week, start_time_of_day, end_time_of_day);

-- Step 4: Create function to get current enrollment count for a schedule
CREATE OR REPLACE FUNCTION get_schedule_enrollment_count(p_schedule_id UUID)
RETURNS INTEGER AS $$
DECLARE
  enrollment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO enrollment_count
  FROM public.schedule_enrollments se
  JOIN public.bookings b ON se.booking_id = b.id
  WHERE se.schedule_id = p_schedule_id
    AND se.status = 'active'
    AND b.status IN ('pending', 'confirmed');
  
  RETURN COALESCE(enrollment_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create function to check if schedule has available capacity
CREATE OR REPLACE FUNCTION check_schedule_capacity(p_schedule_id UUID)
RETURNS JSON AS $$
DECLARE
  schedule_record RECORD;
  current_count INTEGER;
  has_capacity BOOLEAN;
BEGIN
  -- Get schedule with max_students
  SELECT id, max_students INTO schedule_record
  FROM public.class_schedules
  WHERE id = p_schedule_id;
  
  IF schedule_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'SCHEDULE_NOT_FOUND',
      'message', 'Schedule not found'
    );
  END IF;
  
  -- Get current enrollment count
  current_count := get_schedule_enrollment_count(p_schedule_id);
  has_capacity := current_count < schedule_record.max_students;
  
  RETURN json_build_object(
    'success', true,
    'has_capacity', has_capacity,
    'max_students', schedule_record.max_students,
    'current_enrollments', current_count,
    'available_spots', schedule_record.max_students - current_count
  );
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create function to enroll booking to schedule with capacity check
CREATE OR REPLACE FUNCTION enroll_booking_to_schedule(
  p_schedule_id UUID,
  p_booking_id UUID
)
RETURNS JSON AS $$
DECLARE
  capacity_check JSON;
  new_enrollment_id UUID;
BEGIN
  -- Check capacity first
  capacity_check := check_schedule_capacity(p_schedule_id);
  
  IF NOT (capacity_check->>'success')::boolean THEN
    RETURN capacity_check;
  END IF;
  
  IF NOT (capacity_check->>'has_capacity')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'error', 'CAPACITY_FULL',
      'message', 'Schedule slot is full. Max students: ' || (capacity_check->>'max_students') || ', Current: ' || (capacity_check->>'current_enrollments'),
      'max_students', (capacity_check->>'max_students')::integer,
      'current_enrollments', (capacity_check->>'current_enrollments')::integer
    );
  END IF;
  
  -- Check if already enrolled
  IF EXISTS (
    SELECT 1 FROM public.schedule_enrollments
    WHERE schedule_id = p_schedule_id AND booking_id = p_booking_id AND status = 'active'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'ALREADY_ENROLLED',
      'message', 'Booking is already enrolled in this schedule'
    );
  END IF;
  
  -- Create enrollment
  INSERT INTO public.schedule_enrollments (schedule_id, booking_id, status)
  VALUES (p_schedule_id, p_booking_id, 'active')
  ON CONFLICT (schedule_id, booking_id) 
  DO UPDATE SET status = 'active', updated_at = NOW()
  RETURNING id INTO new_enrollment_id;
  
  RETURN json_build_object(
    'success', true,
    'enrollment_id', new_enrollment_id,
    'message', 'Successfully enrolled booking to schedule'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'DATABASE_ERROR',
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create function to cancel enrollment
CREATE OR REPLACE FUNCTION cancel_schedule_enrollment(
  p_schedule_id UUID,
  p_booking_id UUID
)
RETURNS JSON AS $$
BEGIN
  UPDATE public.schedule_enrollments
  SET status = 'cancelled', updated_at = NOW()
  WHERE schedule_id = p_schedule_id AND booking_id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'ENROLLMENT_NOT_FOUND',
      'message', 'Enrollment not found'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Enrollment cancelled successfully'
  );
END;
$$ LANGUAGE plpgsql;

-- Step 8: Enable RLS on schedule_enrollments
ALTER TABLE public.schedule_enrollments ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies for schedule_enrollments
CREATE POLICY "Service can manage schedule enrollments" ON public.schedule_enrollments
  FOR ALL USING (true);

-- Step 10: Add comments for documentation
COMMENT ON TABLE public.schedule_enrollments IS 'Links schedules to multiple bookings for subscription/permanent booking model';
COMMENT ON COLUMN public.class_schedules.day_of_week IS 'Day of week for recurring schedule (monday, tuesday, etc)';
COMMENT ON COLUMN public.class_schedules.max_students IS 'Maximum number of students that can book this schedule slot';
COMMENT ON COLUMN public.class_schedules.start_time_of_day IS 'Start time of day for the schedule (TIME only, no date)';
COMMENT ON COLUMN public.class_schedules.end_time_of_day IS 'End time of day for the schedule (TIME only, no date)';
COMMENT ON FUNCTION get_schedule_enrollment_count IS 'Returns count of active enrollments for a schedule (pending + confirmed bookings)';
COMMENT ON FUNCTION check_schedule_capacity IS 'Checks if a schedule has available capacity for new bookings';
COMMENT ON FUNCTION enroll_booking_to_schedule IS 'Enrolls a booking to a schedule with capacity checking';
COMMENT ON FUNCTION cancel_schedule_enrollment IS 'Cancels an enrollment (marks as cancelled)';

-- Step 11: Grant permissions
GRANT EXECUTE ON FUNCTION get_schedule_enrollment_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_schedule_capacity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION enroll_booking_to_schedule(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_schedule_enrollment(UUID, UUID) TO authenticated;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '✅ Subscription Booking System migration completed successfully!';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  - Added day_of_week, max_students, start_time_of_day, end_time_of_day to class_schedules';
  RAISE NOTICE '  - Created schedule_enrollments table for multi-booking';
  RAISE NOTICE '  - Created helper functions: get_schedule_enrollment_count, check_schedule_capacity';
  RAISE NOTICE '  - Created enrollment functions: enroll_booking_to_schedule, cancel_schedule_enrollment';
END $$;
