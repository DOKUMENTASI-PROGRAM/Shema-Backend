/**
 * Shared CORS Configuration
 * Centralized CORS settings for all microservices
 */

export const corsConfig = {
  origin: (origin: string) => {
    // Allow all origins in development
    if (process.env.NODE_ENV === 'development') {
      return origin || '*'
    }

    // In production, use whitelist from environment variable
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || []
    
    if (!origin || allowedOrigins.includes(origin)) {
      return origin
    }

    // Default fallback for production
    return 'https://shemamusic.com'
  },
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Service-Name'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  maxAge: 86400, // 24 hours
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
}

/**
 * Service-to-Service CORS Configuration
 * More permissive for internal service communication
 */
export const internalCorsConfig = {
  origin: '*',
  credentials: false,
  allowHeaders: ['Content-Type', 'Authorization', 'X-Service-Name', 'X-Service-Token'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}
