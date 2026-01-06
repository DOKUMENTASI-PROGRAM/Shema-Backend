-- Security Hardening Migration
-- Enable RLS and set strict policies for sensitive tables

-- 1. Bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own bookings
CREATE POLICY "Users can view own bookings"
ON bookings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can create their own bookings
CREATE POLICY "Users can create bookings"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own bookings (e.g. cancel)
CREATE POLICY "Users can update own bookings"
ON bookings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);


-- 2. Enrollments
-- enrollment linkage is via booking_id -> bookings.user_id
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own enrollments
CREATE POLICY "Users can view own enrollments"
ON enrollments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = enrollments.booking_id
    AND bookings.user_id = auth.uid()
  )
);


-- 3. Students
-- Table is named 'students', not 'student_profiles' as per live schema check
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON students FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON students FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON students FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);


-- 4. Class Schedules
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view schedules (needed for browsing/booking)
CREATE POLICY "Authenticated users can view schedules"
ON class_schedules FOR SELECT
TO authenticated
USING (true);


-- 5. Revoke ANON permissions (CRITICAL FIX)
-- Ensure anonymous users cannot access these tables directly
REVOKE ALL ON bookings FROM anon;
REVOKE ALL ON enrollments FROM anon;
REVOKE ALL ON students FROM anon;
REVOKE ALL ON class_schedules FROM anon;

-- Note: Backend services using Service Role key will bypass RLS automatically.
