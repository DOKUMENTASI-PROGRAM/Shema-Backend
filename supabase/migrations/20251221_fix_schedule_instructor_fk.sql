-- Description: Fix mismatched Foreign Key for schedules. 
-- Previously it referenced users(id), but should reference instructor_profiles(id) to support standalone instructors.

BEGIN;

-- 1. Drop the conflicting trigger and function
DROP TRIGGER IF EXISTS trg_enforce_instructor_role ON public.class_schedules;
DROP FUNCTION IF EXISTS public.enforce_instructor_role();

-- 2. Drop the old Foreign Key constraint linking to users table
ALTER TABLE public.class_schedules
    DROP CONSTRAINT IF EXISTS class_schedules_instructor_id_fkey;

-- 3. Add new Foreign Key constraint linking to instructor_profiles table
-- Note: asking user to ensure instructor_profiles.id is the Primary Key or Unique
ALTER TABLE public.class_schedules
    ADD CONSTRAINT class_schedules_instructor_id_fkey
    FOREIGN KEY (instructor_id)
    REFERENCES public.instructor_profiles(id)
    ON DELETE RESTRICT;

COMMIT;
