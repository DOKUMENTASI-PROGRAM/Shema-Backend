-- Create assessment tables for recommendation service
-- Migration: 20251018_create_assessment_tables.sql

-- Create test_assessment table
CREATE TABLE IF NOT EXISTS public.test_assessment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL,
  assessment_data JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_status CHECK (status IN ('submitted', 'processing', 'completed', 'failed'))
);

-- Create result_test table
CREATE TABLE IF NOT EXISTS public.result_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.test_assessment(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  ai_analysis JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_result_status CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_assessment_session_id ON public.test_assessment(session_id);
CREATE INDEX IF NOT EXISTS idx_test_assessment_status ON public.test_assessment(status);
CREATE INDEX IF NOT EXISTS idx_test_assessment_created_at ON public.test_assessment(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_assessment_data_gin ON public.test_assessment USING GIN (assessment_data);

CREATE INDEX IF NOT EXISTS idx_result_test_assessment_id ON public.result_test(assessment_id);
CREATE INDEX IF NOT EXISTS idx_result_test_session_id ON public.result_test(session_id);
CREATE INDEX IF NOT EXISTS idx_result_test_created_at ON public.result_test(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_result_test_ai_analysis_gin ON public.result_test USING GIN (ai_analysis);

-- Enable RLS
ALTER TABLE public.test_assessment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_test ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (service-level access)
CREATE POLICY "Service can manage assessments" ON public.test_assessment
  FOR ALL USING (true);

CREATE POLICY "Service can manage results" ON public.result_test
  FOR ALL USING (true);