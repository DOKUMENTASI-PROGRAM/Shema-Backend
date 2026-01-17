-- Add deleted_at column to class_schedules for soft delete
ALTER TABLE public.class_schedules
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for faster filtering of non-deleted records
CREATE INDEX IF NOT EXISTS idx_class_schedules_deleted_at 
ON public.class_schedules(deleted_at);

-- Comment
COMMENT ON COLUMN public.class_schedules.deleted_at IS 'Timestamp when the schedule was soft-deleted';

-- Note: Exclusion constraints on start_time/end_time are skipped 
-- because current data contains NULLs in these legacy columns.
