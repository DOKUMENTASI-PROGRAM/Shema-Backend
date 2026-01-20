-- Add deleted_at column to instructor_profiles for soft delete
ALTER TABLE public.instructor_profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for faster filtering of non-deleted records
CREATE INDEX IF NOT EXISTS idx_instructor_profiles_deleted_at 
ON public.instructor_profiles(deleted_at);

-- Comment
COMMENT ON COLUMN public.instructor_profiles.deleted_at IS 'Timestamp when the instructor was soft-deleted';
