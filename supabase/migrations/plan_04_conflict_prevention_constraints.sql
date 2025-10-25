-- PLAN 04: Conflict Prevention System - Database Constraints
-- Execute this script in Supabase SQL Editor: https://app.supabase.com/project/xlrwvzwpecprhgzfcqxw/supabase.co/sql

-- Add exclusion constraints to prevent instructor double-booking
-- Note: PostgreSQL exclusion constraints require specific extensions and setup
-- For now, we'll rely on application-level conflict checking

-- Create indexes for better conflict detection performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_schedules_instructor_time_range
ON class_schedules (instructor_id, start_time, end_time)
WHERE booking_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_schedules_room_time_range
ON class_schedules (room_id, start_time, end_time)
WHERE booking_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_schedules_combined_conflict
ON class_schedules (instructor_id, room_id, start_time, end_time)
WHERE booking_id IS NOT NULL;

-- Create a function to check for schedule conflicts
CREATE OR REPLACE FUNCTION check_schedule_conflicts(
  p_instructor_id UUID,
  p_room_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS TABLE (
  conflict_type TEXT,
  conflicting_schedule_id UUID,
  conflicting_booking_id UUID,
  conflicting_entity TEXT,
  conflict_start_time TIMESTAMPTZ,
  conflict_end_time TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN cs.instructor_id = p_instructor_id THEN 'instructor'
      WHEN cs.room_id = p_room_id THEN 'room'
      ELSE 'unknown'
    END::TEXT as conflict_type,
    cs.id as conflicting_schedule_id,
    cs.booking_id as conflicting_booking_id,
    CASE
      WHEN cs.instructor_id = p_instructor_id THEN ip.full_name
      WHEN cs.room_id = p_room_id THEN r.name
      ELSE 'Unknown'
    END::TEXT as conflicting_entity,
    cs.start_time as conflict_start_time,
    cs.end_time as conflict_end_time
  FROM class_schedules cs
  JOIN bookings b ON cs.booking_id = b.id
  LEFT JOIN instructor_profiles ip ON cs.instructor_id = ip.id
  LEFT JOIN rooms r ON cs.room_id = r.id
  WHERE b.status = 'confirmed'
    AND (cs.instructor_id = p_instructor_id OR cs.room_id = p_room_id)
    AND (
      (cs.start_time < p_end_time AND cs.end_time > p_start_time)
    )
    AND (p_exclude_booking_id IS NULL OR cs.booking_id != p_exclude_booking_id);
END;
$$;

-- Create a function to safely create schedule with conflict checking
CREATE OR REPLACE FUNCTION create_schedule_with_conflicts(
  p_course_id UUID,
  p_instructor_id UUID,
  p_room_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_booking_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  conflict_count INTEGER;
  new_schedule_id UUID;
  result JSON;
BEGIN
  -- Check for conflicts
  SELECT COUNT(*) INTO conflict_count
  FROM check_schedule_conflicts(p_instructor_id, p_room_id, p_start_time, p_end_time, p_booking_id);

  IF conflict_count > 0 THEN
    -- Return conflict information
    SELECT json_build_object(
      'success', false,
      'error', 'CONFLICT_DETECTED',
      'conflicts', json_agg(
        json_build_object(
          'type', conflict_type,
          'schedule_id', conflicting_schedule_id,
          'booking_id', conflicting_booking_id,
          'entity', conflicting_entity,
          'time_range', json_build_object(
            'start', conflict_start_time,
            'end', conflict_end_time
          )
        )
      )
    ) INTO result
    FROM check_schedule_conflicts(p_instructor_id, p_room_id, p_start_time, p_end_time, p_booking_id);

    RETURN result;
  END IF;

  -- No conflicts, create the schedule
  INSERT INTO class_schedules (
    course_id,
    instructor_id,
    room_id,
    start_time,
    end_time,
    booking_id,
    created_at,
    updated_at
  )
  VALUES (
    p_course_id,
    p_instructor_id,
    p_room_id,
    p_start_time,
    p_end_time,
    p_booking_id,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_schedule_id;

  -- Return success
  result := json_build_object(
    'success', true,
    'schedule_id', new_schedule_id,
    'message', 'Schedule created successfully'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'DATABASE_ERROR',
      'message', SQLERRM
    );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_schedule_conflicts(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_schedule_with_conflicts(UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;

-- Create a table for conflict monitoring (optional)
CREATE TABLE IF NOT EXISTS conflict_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  has_conflicts BOOLEAN NOT NULL,
  conflict_count INTEGER DEFAULT 0,
  check_duration INTEGER, -- in milliseconds
  conflict_types TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on conflict_metrics
ALTER TABLE conflict_metrics ENABLE ROW LEVEL SECURITY;

-- Allow admins to read conflict metrics
CREATE POLICY "Admins can read conflict metrics" ON conflict_metrics
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Allow system to insert conflict metrics
CREATE POLICY "System can insert conflict metrics" ON conflict_metrics
  FOR INSERT WITH CHECK (true);

COMMENT ON TABLE conflict_metrics IS 'Tracks conflict detection performance and statistics';
COMMENT ON FUNCTION check_schedule_conflicts IS 'Checks for scheduling conflicts between instructors and rooms';
COMMENT ON FUNCTION create_schedule_with_conflicts IS 'Safely creates schedules with conflict prevention';