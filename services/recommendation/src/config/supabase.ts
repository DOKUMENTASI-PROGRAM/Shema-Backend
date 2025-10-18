/**
 * Supabase Client for Recommendation Service
 * Enhanced configuration with error handling and connection options
 */

import { createClient } from '@supabase/supabase-js'

// Validate required environment variables
const supabaseUrl = process.env.SUPABASE_URL || (process.env.NODE_ENV === 'test' ? 'https://test.supabase.co' : '')
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.NODE_ENV === 'test' ? 'test-key' : '')

// Skip validation in test environment
if (process.env.NODE_ENV !== 'test') {
  if (!supabaseUrl) {
    throw new Error(
      'SUPABASE_URL is not defined. Please check your environment variables.'
    )
  }

  if (!supabaseServiceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not defined. Please check your environment variables.'
    )
  }
}

// Create Supabase client with service role key for full access
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Service-Name': 'recommendation-service'
    }
  }
})

// Test connection function
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('test_assessment')
      .select('id')
      .limit(1)

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Supabase connection test failed:', error)
      return false
    }

    console.log('✅ Supabase connection successful')
    return true
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error)
    return false
  }
}