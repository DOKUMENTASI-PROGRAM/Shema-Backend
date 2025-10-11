/**
 * Shared Supabase Client Configuration
 * Used by all microservices to connect to Supabase
 * Supports both local development and production environments
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getEnvironmentConfig } from './environment'

/**
 * Get Supabase configuration for current environment
 */
function getSupabaseConfig() {
  const env = getEnvironmentConfig()

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase configuration. Check your environment variables.')
  }

  return {
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: env.SUPABASE_ANON_KEY,
  }
}

/**
 * Create Supabase client with service role (bypass RLS for backend services)
 * Used for administrative operations and data management
 */
export function createSupabaseClient(): SupabaseClient {
  const config = getSupabaseConfig()

  const client = createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'shema-backend-service',
      },
    },
  })

  // Log connection info in development
  if (getEnvironmentConfig().NODE_ENV === 'development') {
    console.log(`🔗 Connected to Supabase: ${config.url}`)
  }

  return client
}

/**
 * Create Supabase client with anon key (respects RLS for user operations)
 * Used when you need to respect Row Level Security policies
 */
export function createSupabaseAnonClient(): SupabaseClient {
  const config = getSupabaseConfig()

  if (!config.anonKey) {
    throw new Error('SUPABASE_ANON_KEY is required for anon client')
  }

  return createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'shema-backend-anon',
      },
    },
  })
}

// Export singleton instances for convenience
export const supabase = createSupabaseClient()
export const supabaseAnon = createSupabaseAnonClient()

// Default export for backward compatibility
export default supabase
