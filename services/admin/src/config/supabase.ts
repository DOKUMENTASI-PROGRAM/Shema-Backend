/**
 * Supabase Client for Auth Service
 * Enhanced configuration with error handling and connection options
 */

import { createClient } from '@supabase/supabase-js'

// Validate required environment variables
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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

// Validate URL format
try {
  new URL(supabaseUrl)
} catch (error) {
  throw new Error(
    `Invalid SUPABASE_URL format: ${supabaseUrl}. Expected a valid URL.`
  )
}

// Create Supabase client with production-ready configuration
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'shema-music-auth-service',
    },
  },
  // Retry configuration for production reliability
  realtime: {
    timeout: 10000,
  },
})

// Test connection on startup (optional, for debugging)
if (process.env.NODE_ENV === 'development') {
  supabase
    .from('users')
    .select('count')
    .limit(1)
    .then(({ error }) => {
      if (error) {
        console.error('❌ Supabase connection test failed:', error.message)
      } else {
        console.log('✅ Supabase connected successfully to:', supabaseUrl)
      }
    })
}

export default supabase
