-- ============================================
-- Migration: Add instrument column to courses table
-- Date: October 11, 2025
-- Purpose: Fix booking service schema mismatch
-- ============================================

-- Add instrument column to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS instrument VARCHAR(100);

-- Add index for faster queries on instrument
CREATE INDEX IF NOT EXISTS idx_courses_instrument ON public.courses(instrument);

-- Add comment to document the column
COMMENT ON COLUMN public.courses.instrument IS 'Musical instrument taught in this course (e.g., piano, guitar, violin, drums)';

-- Update existing courses with default instrument (optional)
-- You can customize this based on course titles or set to NULL
UPDATE public.courses 
SET instrument = CASE 
  WHEN title ILIKE '%piano%' THEN 'piano'
  WHEN title ILIKE '%guitar%' OR title ILIKE '%gitar%' THEN 'guitar'
  WHEN title ILIKE '%violin%' OR title ILIKE '%biola%' THEN 'violin'
  WHEN title ILIKE '%drum%' THEN 'drums'
  WHEN title ILIKE '%vocal%' OR title ILIKE '%singing%' THEN 'vocal'
  WHEN title ILIKE '%bass%' THEN 'bass'
  ELSE 'general'
END
WHERE instrument IS NULL;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added instrument column to courses table';
END $$;
