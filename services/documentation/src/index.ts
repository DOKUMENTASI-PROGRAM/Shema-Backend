/**
 * Documentation Service - Main Entry Point
 * API Documentation Service for Shema Music Backend
 * Port: 3007
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { connectRedis, disconnectRedis } from './config/redis'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', prettyJSON())

// CORS Configuration - Production Ready
const corsOrigin = process.env.NODE_ENV === 'development'
  ? '*'
  : (process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'])

app.use('*', cors({
  origin: corsOrigin,
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization', 'X-Service-Name'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 86400,
}))

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    service: 'documentation-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    docs: ['api-docs', 'swagger', 'redoc']
  })
})

// API Documentation routes
app.get('/api/docs', (c) => {
  return c.json({
    title: 'Shema Music API Documentation',
    version: '1.0.0',
    description: 'Complete API documentation for Shema Music Backend services',
    services: [
      {
        name: 'API Gateway',
        port: 3000,
        baseUrl: 'http://localhost:3000',
        endpoints: ['/health', '/api/*']
      },
      {
        name: 'Auth Service',
        port: 3001,
        baseUrl: 'http://localhost:3001',
        endpoints: ['/health', '/api/auth/*', '/api/auth/firebase/*']
      },
      {
        name: 'Admin Service',
        port: 3002,
        baseUrl: 'http://localhost:3002',
        endpoints: ['/health', '/api/admin/*']
      },
      {
        name: 'Course Service',
        port: 3003,
        baseUrl: 'http://localhost:3003',
        endpoints: ['/health', '/api/courses/*']
      },
      {
        name: 'Booking Service',
        port: 3004,
        baseUrl: 'http://localhost:3004',
        endpoints: ['/health', '/api/booking/*']
      }
    ],
    environment: process.env.NODE_ENV || 'development'
  })
})

// Swagger/OpenAPI spec endpoint
app.get('/api/docs/swagger', (c) => {
  return c.json({
    openapi: '3.0.0',
    info: {
      title: 'Shema Music API',
      version: '1.0.0',
      description: 'Microservices API for Shema Music platform'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'API Gateway'
      }
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Health check',
          responses: {
            '200': {
              description: 'Service is healthy'
            }
          }
        }
      }
    }
  })
})

// Service status endpoint
app.get('/api/docs/status', async (c) => {
  // TODO: Implement actual service health checks
  return c.json({
    services: {
      'api-gateway': { status: 'unknown', port: 3000 },
      'auth-service': { status: 'unknown', port: 3001 },
      'admin-service': { status: 'unknown', port: 3002 },
      'course-service': { status: 'unknown', port: 3003 },
      'booking-service': { status: 'unknown', port: 3004 },
      'documentation-service': { status: 'healthy', port: 3007 }
    },
    timestamp: new Date().toISOString()
  })
})

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Documentation endpoint not found'
    }
  }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    }
  }, 500)
})

// Start server
const PORT = process.env.PORT || 3007

async function start() {
  try {
    // Connect to Redis
    console.log('🔄 Connecting to Redis...')
    await connectRedis()

    console.log(`🚀 Documentation Service starting on port ${PORT}...`)
    console.log(`📍 Health check: http://localhost:${PORT}/health`)
    console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`)
    console.log(`📖 Swagger: http://localhost:${PORT}/api/docs/swagger`)
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)

  } catch (error) {
    console.error('❌ Failed to start Documentation Service:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Documentation Service...')
  await disconnectRedis()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down Documentation Service...')
  await disconnectRedis()
  process.exit(0)
})

// Start the service
start()

export default {
  port: PORT,
  fetch: app.fetch
}
