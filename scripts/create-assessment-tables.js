#!/usr/bin/env node
/**
 * Create assessment tables in Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createTables() {
  console.log('🚀 Creating assessment tables...\n');

  try {
    // Create test_assessment table
    console.log('📋 Creating test_assessment table...');
    const { error: error1 } = await supabase.from('test_assessment').select('id').limit(1);
    if (error1 && error1.code === 'PGRST116') {
      console.log('✅ test_assessment table already exists');
    } else if (error1) {
      console.log('❌ Error checking test_assessment table:', error1.message);
      // Try to create via SQL
      console.log('🔧 Attempting to create test_assessment table...');
      // Note: This won't work with Supabase REST API, need to use Dashboard
    }

    // Create result_test table
    console.log('📊 Creating result_test table...');
    const { error: error2 } = await supabase.from('result_test').select('id').limit(1);
    if (error2 && error2.code === 'PGRST116') {
      console.log('✅ result_test table already exists');
    } else if (error2) {
      console.log('❌ Error checking result_test table:', error2.message);
    }

    console.log('\n⚠️  If tables don\'t exist, please run this SQL in Supabase Dashboard:');
    console.log('https://supabase.com/dashboard/project/xlrwvzwpecprhgzfcqxw/sql/new\n');

    const sql = `
CREATE TABLE IF NOT EXISTS public.test_assessment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL,
  assessment_data JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_status CHECK (status IN ('submitted', 'processing', 'completed', 'failed'))
);

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_test_assessment_session_id ON public.test_assessment(session_id);
CREATE INDEX IF NOT EXISTS idx_result_test_session_id ON public.result_test(session_id);
    `;

    console.log(sql);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTables();