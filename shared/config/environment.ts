/**
 * Environment Configuration Manager
 * Handles loading and validation of environment variables
 * Supports multiple environments (development, production)
 */

import { z } from 'zod'
import { config } from 'dotenv'

// Environment schema validation
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Gateway
  PORT: z.string().transform(Number).default(3000),
  CORS_ORIGIN: z.string().default('*'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  SERVICE_JWT_SECRET: z.string().min(32, 'SERVICE_JWT_SECRET must be at least 32 characters'),

  // Redis
  REDIS_URL: z.string().url().default('redis://redis:6379'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),

  // Firebase (Optional)
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
})

export type EnvironmentConfig = z.infer<typeof envSchema>

/**
 * Load environment configuration
 * @param env - Environment to load (development, production, test)
 * @returns Validated environment configuration
 */
export function loadEnvironment(env: 'development' | 'production' | 'test' = 'development'): EnvironmentConfig {
  // Load environment file based on NODE_ENV or parameter
  const envFile = `.env.${env}`
  config({ path: envFile })

  // Also load .env as fallback
  config()

  try {
    const parsed = envSchema.parse(process.env)
    return parsed
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:')
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
    }
    throw new Error(`Invalid environment configuration for ${env}`)
  }
}

/**
 * Get current environment configuration
 * Automatically detects environment from NODE_ENV
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const nodeEnv = (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development'
  return loadEnvironment(nodeEnv)
}

/**
 * Environment helpers
 */
export const Environment = {
  isDevelopment: () => getEnvironmentConfig().NODE_ENV === 'development',
  isProduction: () => getEnvironmentConfig().NODE_ENV === 'production',
  isTest: () => getEnvironmentConfig().NODE_ENV === 'test',
  get current() { return getEnvironmentConfig().NODE_ENV },
  get config() { return getEnvironmentConfig() },
}

export default Environment