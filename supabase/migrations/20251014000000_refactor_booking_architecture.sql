-- ============================================
-- Migration: Refactor Booking Architecture
-- Date: October 14, 2025
-- Purpose: Implement new booking architecture
-- ============================================
-- 
-- Changes:
-- 1. users table: Khusus admin auth (Firebase)
-- 2. instructor_profiles: Entitas utama untuk instruktur dan jadwal
-- 3. bookings: Menyimpan identitas pendaftar/siswa dengan applicant_* fields
-- 4. bookings.user_id: FK dilepas, tidak ketergantungan ke users
-- 5. enrollments & schedule_attendees: Transisi ke booking_id
-- 6. Spam prevention: Guard berdasarkan email pendaftar
-- ============================================

-- Step 1: Add applicant fields to bookings table (if not exists)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS applicant_full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS applicant_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS applicant_wa_number VARCHAR(25);

-- Step 2: Remove FK constraint from bookings.user_id
-- This allows bookings to exist without a user account
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;

-- Make user_id nullable since bookings can exist without user accounts
ALTER TABLE public.bookings 
ALTER COLUMN user_id DROP NOT NULL;

-- Step 3: Add booking_id to enrollments table for transition
ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS booking_id UUID;

-- Add FK constraint for booking_id
ALTER TABLE public.enrollments 
ADD CONSTRAINT enrollments_booking_id_fkey 
FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

-- Step 4: Add booking_id to schedule_attendees table for transition
ALTER TABLE public.schedule_attendees 
ADD COLUMN IF NOT EXISTS booking_id UUID;

-- Add FK constraint for booking_id
ALTER TABLE public.schedule_attendees 
ADD CONSTRAINT schedule_attendees_booking_id_fkey 
FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

-- Step 5: Create index for spam prevention (email-based)
CREATE INDEX IF NOT EXISTS idx_bookings_applicant_email 
ON public.bookings(applicant_email);

CREATE INDEX IF NOT EXISTS idx_bookings_applicant_email_pending 
ON public.bookings(applicant_email, status) 
WHERE status = 'pending';

-- Step 6: Add constraint to prevent spam bookings
-- Allow max 3 pending bookings per email
CREATE OR REPLACE FUNCTION check_pending_bookings_limit()
RETURNS TRIGGER AS $$
DECLARE
  pending_count INTEGER;
BEGIN
  -- Only check for pending bookings
  IF NEW.status = 'pending' AND NEW.applicant_email IS NOT NULL THEN
    SELECT COUNT(*) INTO pending_count
    FROM public.bookings
    WHERE applicant_email = NEW.applicant_email
      AND status = 'pending'
      AND expires_at > NOW();
    
    IF pending_count >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 pending bookings allowed per email. Please wait for existing bookings to be processed.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for spam prevention
DROP TRIGGER IF EXISTS trg_check_pending_bookings_limit ON public.bookings;
CREATE TRIGGER trg_check_pending_bookings_limit
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_pending_bookings_limit();

-- Step 7: Update indexes for better performance
-- Remove old user_id index if exists
DROP INDEX IF EXISTS public.idx_bookings_user_id;

-- Add new indexes for applicant-based queries
CREATE INDEX IF NOT EXISTS idx_bookings_applicant_full_name 
ON public.bookings(applicant_full_name);

-- Step 8: Add comments for documentation
COMMENT ON COLUMN public.bookings.user_id IS 'Optional reference to users table. NULL for bookings without user accounts (course registration).';
COMMENT ON COLUMN public.bookings.applicant_full_name IS 'Full name of the applicant/student for course registration.';
COMMENT ON COLUMN public.bookings.applicant_email IS 'Email of the applicant/student. Used for spam prevention and communication.';
COMMENT ON COLUMN public.bookings.applicant_wa_number IS 'WhatsApp number of the applicant/student for communication.';
COMMENT ON COLUMN public.enrollments.booking_id IS 'Reference to booking. Replaces student_id for new enrollments.';
COMMENT ON COLUMN public.schedule_attendees.booking_id IS 'Reference to booking. Replaces student_id for new attendance records.';

-- Step 9: Create view for active bookings with applicant info
CREATE OR REPLACE VIEW public.active_bookings_with_applicants AS
SELECT 
  b.id,
  b.course_id,
  b.status,
  b.expires_at,
  b.confirmed_at,
  b.experience_level,
  b.preferred_days,
  b.preferred_time_range,
  b.start_date_target,
  b.guardian_name,
  b.guardian_wa_number,
  b.instrument_owned,
  b.notes,
  b.referral_source,
  b.created_at,
  b.updated_at,
  -- Applicant information (prioritize applicant fields over user fields)
  COALESCE(b.applicant_full_name, u.full_name) as full_name,
  COALESCE(b.applicant_email, u.email) as email,
  COALESCE(b.applicant_wa_number, u.wa_number) as wa_number,
  -- User reference (optional)
  b.user_id,
  u.role as user_role,
  -- Course information
  c.title as course_title,
  c.level as course_level,
  c.price_per_session,
  c.duration_minutes
FROM public.bookings b
LEFT JOIN public.users u ON b.user_id = u.id
JOIN public.courses c ON b.course_id = c.id
WHERE b.status IN ('pending', 'confirmed');

COMMENT ON VIEW public.active_bookings_with_applicants IS 'Active bookings with applicant information. Combines applicant fields and user data.';

-- Step 10: Create function for cleaning expired bookings (for cron job)
CREATE OR REPLACE FUNCTION clean_expired_bookings()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update expired bookings
  UPDATE public.bookings
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clean_expired_bookings() IS 'Marks pending bookings as expired if past expires_at. Returns count of expired bookings. Use in cron job.';

-- Step 11: Add validation for applicant fields
-- At least one of user_id or applicant_email must be present
ALTER TABLE public.bookings
ADD CONSTRAINT chk_booking_identity CHECK (
  user_id IS NOT NULL OR applicant_email IS NOT NULL
);

-- If applicant_email is present, applicant_full_name must also be present
ALTER TABLE public.bookings
ADD CONSTRAINT chk_applicant_complete CHECK (
  (applicant_email IS NULL AND applicant_full_name IS NULL) OR
  (applicant_email IS NOT NULL AND applicant_full_name IS NOT NULL)
);

-- ============================================
-- Migration Notes:
-- ============================================
-- 
-- IMPORTANT: This is a transitional migration
-- 
-- Phase 1 (Current): Both student_id and booking_id exist in enrollments/schedule_attendees
-- - Old records use student_id
-- - New records should use booking_id
-- - student_id will be deprecated in future migration
-- 
-- Phase 2 (Future): Remove student_id completely
-- - Migrate all old records to use booking_id
-- - Drop student_id columns
-- - Drop FK constraints to users table
-- 
-- API Changes Required:
-- 1. POST /api/courses/register - Write to bookings only, use applicant_* fields
-- 2. GET /api/schedules - Use instructor_profiles for instructor data
-- 3. POST /api/enrollments - Use booking_id instead of student_id
-- 4. POST /api/attendance - Use booking_id instead of student_id
-- 
-- Cron Job:
-- - Run clean_expired_bookings() daily to mark expired bookings
-- - Example: SELECT clean_expired_bookings();
-- 
-- ============================================

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '✅ Booking architecture refactored successfully!';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  - bookings.user_id FK removed (nullable)';
  RAISE NOTICE '  - applicant_* fields added to bookings';
  RAISE NOTICE '  - booking_id added to enrollments & schedule_attendees';
  RAISE NOTICE '  - Spam prevention: max 3 pending bookings per email';
  RAISE NOTICE '  - View: active_bookings_with_applicants created';
  RAISE NOTICE '  - Function: clean_expired_bookings() created';
  RAISE NOTICE 'Next steps: Update API endpoints to use new architecture';
END $$;

