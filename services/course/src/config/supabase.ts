/**
 * Supabase Client for Course Service
 * Uses shared configuration for consistent database connections
 */

import { createSupabaseClient } from '../../../shared/config/supabase'

// Export the shared Supabase client
export const supabase = createSupabaseClient()

export default supabase