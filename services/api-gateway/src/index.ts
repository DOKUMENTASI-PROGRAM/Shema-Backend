/**
 * API Gateway - Main Entry Point
 * Routes requests to microservices in Shema Music Backend
 * Port: 3000
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { connectRedis, disconnectRedis } from './config/redis'
import { GATEWAY_CONFIG, SERVICE_URLS } from './config/services'
import routes from './routes'

const app = new Hono()

// ============================================
// MIDDLEWARE
// ============================================
app.use('*', logger())
app.use('*', prettyJSON())

// CORS Configuration - Production Ready
const corsOrigin = GATEWAY_CONFIG.NODE_ENV === 'development' 
  ? '*' 
  : (process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'])

app.use('*', cors({
  origin: corsOrigin,
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Service-Name'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  maxAge: 86400, // 24 hours
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
}))

// ============================================
// HEALTH CHECK & SERVICE DISCOVERY
// ============================================
app.get('/health', (c) => {
  return c.json({
    service: 'api-gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    environment: GATEWAY_CONFIG.NODE_ENV,
  })
})

app.get('/services', (c) => {
  return c.json({
    success: true,
    data: {
      gateway: {
        port: GATEWAY_CONFIG.PORT,
        environment: GATEWAY_CONFIG.NODE_ENV,
      },
      services: {
        auth: SERVICE_URLS.AUTH_SERVICE,
        user: SERVICE_URLS.USER_SERVICE,
        course: SERVICE_URLS.COURSE_SERVICE,
        booking: SERVICE_URLS.BOOKING_SERVICE,
        chat: SERVICE_URLS.CHAT_SERVICE,
        recommendation: SERVICE_URLS.RECOMMENDATION_SERVICE,
      },
    },
  })
})

// Check health of all microservices with timeout
app.get('/services/health', async (c) => {
  const HEALTH_CHECK_TIMEOUT = 5000 // 5 seconds

  const checkServiceHealth = async (url: string) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT)

    try {
      const response = await fetch(`${url}/health`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  const serviceHealthChecks = await Promise.allSettled([
    checkServiceHealth(SERVICE_URLS.AUTH_SERVICE),
    checkServiceHealth(SERVICE_URLS.USER_SERVICE),
    checkServiceHealth(SERVICE_URLS.COURSE_SERVICE),
    checkServiceHealth(SERVICE_URLS.BOOKING_SERVICE),
    checkServiceHealth(SERVICE_URLS.CHAT_SERVICE),
    checkServiceHealth(SERVICE_URLS.RECOMMENDATION_SERVICE),
  ])

  const serviceNames = ['auth', 'user', 'course', 'booking', 'chat', 'recommendation']
  const healthStatus: Record<string, any> = {}

  serviceHealthChecks.forEach((result, index) => {
    const serviceName = serviceNames[index]
    if (result.status === 'fulfilled') {
      healthStatus[serviceName] = {
        status: 'healthy',
        data: result.value,
      }
    } else {
      const error = result.reason as Error
      healthStatus[serviceName] = {
        status: 'unhealthy',
        error: error.name === 'AbortError' ? 'Health check timeout' : (error.message || 'Service unavailable'),
      }
    }
  })

  const allHealthy = serviceHealthChecks.every(result => result.status === 'fulfilled')

  return c.json({
    success: true,
    overallStatus: allHealthy ? 'healthy' : 'degraded',
    services: healthStatus,
    timestamp: new Date().toISOString(),
  }, allHealthy ? 200 : 503)
})

// ============================================
// API ROUTES
// ============================================
app.route('/api', routes)

// ============================================
// 404 HANDLER
// ============================================
app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested route does not exist',
      path: c.req.path,
      method: c.req.method,
    },
  }, 404)
})

// ============================================
// ERROR HANDLER
// ============================================
app.onError((err, c) => {
  console.error('Gateway error:', err)

  // Check if it's a known error type
  if (err.message.includes('ECONNREFUSED')) {
    return c.json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Unable to connect to backend service',
        details: GATEWAY_CONFIG.NODE_ENV === 'development' ? err.message : undefined,
      },
    }, 503)
  }

  if (err.message.includes('timeout')) {
    return c.json({
      success: false,
      error: {
        code: 'REQUEST_TIMEOUT',
        message: 'Request to service timed out',
        details: GATEWAY_CONFIG.NODE_ENV === 'development' ? err.message : undefined,
      },
    }, 504)
  }

  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: GATEWAY_CONFIG.NODE_ENV === 'development' ? err.message : undefined,
    },
  }, 500)
})

// ============================================
// SERVER STARTUP
// ============================================
async function startServer() {
  try {
    console.log('🚀 Starting API Gateway...')
    
    // Connect to Redis
    await connectRedis()
    console.log('✅ Redis connected')

    // Start server
    const port = GATEWAY_CONFIG.PORT
    console.log(`🌐 API Gateway running on port ${port}`)
    console.log(`📡 Environment: ${GATEWAY_CONFIG.NODE_ENV}`)
    console.log(`🔗 Services configured:`)
    console.log(`   - Auth Service: ${SERVICE_URLS.AUTH_SERVICE}`)
    console.log(`   - User Service: ${SERVICE_URLS.USER_SERVICE}`)
    console.log(`   - Course Service: ${SERVICE_URLS.COURSE_SERVICE}`)
    console.log(`   - Booking Service: ${SERVICE_URLS.BOOKING_SERVICE}`)
    console.log(`   - Chat Service: ${SERVICE_URLS.CHAT_SERVICE}`)
    console.log(`   - Recommendation Service: ${SERVICE_URLS.RECOMMENDATION_SERVICE}`)
    console.log(`\n✨ API Gateway ready to accept requests!`)

  } catch (error) {
    console.error('❌ Failed to start API Gateway:', error)
    process.exit(1)
  }
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGINT', async () => {
  console.log('\n⚠️  Received SIGINT, shutting down gracefully...')
  await disconnectRedis()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Received SIGTERM, shutting down gracefully...')
  await disconnectRedis()
  process.exit(0)
})

// Start the server
startServer()

export default {
  port: GATEWAY_CONFIG.PORT,
  fetch: app.fetch,
}
