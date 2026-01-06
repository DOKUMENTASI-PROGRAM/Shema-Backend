-- Migration: Fix Enrollment Logic for Idempotency
-- Date: January 2, 2026
-- Purpose: Allow enroll_booking_to_schedule to be idempotent by returning success if already enrolled
--          This fixes the CONFLICT error when admin assigns a slot that was already reserved by the booking

CREATE OR REPLACE FUNCTION enroll_booking_to_schedule(
  p_schedule_id UUID,
  p_booking_id UUID
)
RETURNS JSON AS $$
DECLARE
  capacity_check JSON;
  new_enrollment_id UUID;
  existing_enrollment_id UUID;
BEGIN
  -- 1. Check if already enrolled FIRST
  SELECT id INTO existing_enrollment_id
  FROM public.schedule_enrollments
  WHERE schedule_id = p_schedule_id AND booking_id = p_booking_id AND status = 'active';

  IF existing_enrollment_id IS NOT NULL THEN
    -- Already enrolled? Great! You own the slot.
    RETURN json_build_object(
      'success', true,
      'enrollment_id', existing_enrollment_id,
      'message', 'Booking is already enrolled in this schedule',
      'is_existing', true
    );
  END IF;

  -- 2. Check capacity (Only checks logic if NOT already enrolled)
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
  
  -- 3. Create enrollment
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

-- Notify completion
DO $$ 
BEGIN
  RAISE NOTICE '✅ Fixed enroll_booking_to_schedule function successfully';
END $$;
