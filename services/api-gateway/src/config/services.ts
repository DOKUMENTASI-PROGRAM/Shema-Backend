/**
 * Service URLs Configuration
 * Defines URLs for all microservices in the backend
 */

export const SERVICE_URLS = {
  AUTH_SERVICE: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  USER_SERVICE: process.env.USER_SERVICE_URL || 'http://user-service:3002',
  COURSE_SERVICE: process.env.COURSE_SERVICE_URL || 'http://course-service:3003',
  BOOKING_SERVICE: process.env.BOOKING_SERVICE_URL || 'http://booking-service:3004',
  CHAT_SERVICE: process.env.CHAT_SERVICE_URL || 'http://chat-service:3005',
  RECOMMENDATION_SERVICE: process.env.RECOMMENDATION_SERVICE_URL || 'http://recommendation-service:3006',
}

export const SERVICE_TIMEOUT = parseInt(process.env.SERVICE_TIMEOUT || '30000', 10) // 30 seconds default

export const GATEWAY_CONFIG = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  SERVICE_JWT_SECRET: process.env.SERVICE_JWT_SECRET || 'service-to-service-secret-key',
  ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING !== 'false',
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '3', 10),
}
