-- Create bookings table for course registration
-- This table stores course booking requests with 2-slot selection system

CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'rejected', 'expired', 'cancelled');

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

  -- 2-slot selection system
  first_choice_slot_id UUID,
  second_choice_slot_id UUID,
  confirmed_slot_id UUID,

  -- Booking status and lifecycle
  status booking_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,

  -- Student preferences from registration
  experience_level VARCHAR(20) NOT NULL CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  preferred_days TEXT[] NOT NULL, -- Array of preferred days
  preferred_time_range JSONB NOT NULL, -- {start: "HH:MM", end: "HH:MM"}
  start_date_target DATE,

  -- Guardian information (for students)
  guardian_name VARCHAR(255),
  guardian_wa_number VARCHAR(25),

  -- Additional details
  instrument_owned BOOLEAN,
  notes TEXT,
  referral_source VARCHAR(20) CHECK (referral_source IN ('instagram', 'facebook', 'google', 'tiktok', 'friend', 'website', 'other')),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_booking_slots CHECK (
    (first_choice_slot_id IS NOT NULL AND second_choice_slot_id IS NOT NULL) OR
    status IN ('pending', 'confirmed', 'rejected', 'expired', 'cancelled')
  ),
  CONSTRAINT chk_confirmed_slot CHECK (
    (confirmed_slot_id IS NULL) OR
    (confirmed_slot_id = first_choice_slot_id OR confirmed_slot_id = second_choice_slot_id)
  )
);

-- Indexes for performance
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_course_id ON bookings(course_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_expires_at ON bookings(expires_at);
CREATE INDEX idx_bookings_user_course_pending ON bookings(user_id, course_id) WHERE status = 'pending';

-- Updated at trigger
CREATE TRIGGER trg_bookings_set_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();