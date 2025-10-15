/**
 * Booking Service
 * Course Registration & Booking Management Service
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import bookingRoutes from './routes/bookingRoutes'

const app = new Hono()

// Middleware
app.use('*', logger())

// CORS Configuration - Production Ready
const corsOrigin = process.env.NODE_ENV === 'development' 
  ? '*' 
  : (process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'])

app.use('*', cors({
  origin: corsOrigin,
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization', 'X-Service-Name'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  maxAge: 86400,
}))

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'booking-service',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  })
})

// Routes
app.route('/api/booking', bookingRoutes)

// Error handling
app.onError((err, c) => {
  console.error('Service error:', err)
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    }
  }, 500)
})

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  }, 404)
})

const port = process.env.PORT || 3004

console.log(`🚀 Booking Service starting on port ${port}`)

export default {
  port,
  fetch: app.fetch
}