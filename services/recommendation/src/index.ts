/**
 * Recommendation Service - Main Entry Point
 * AI-Powered Assessment & Recommendation Microservice for Shema Music Backend
 * Port: 3005
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { connectRedis, disconnectRedis } from './config/redis'
import assessmentRoutes from './routes/assessmentRoutes'
import resultRoutes from './routes/resultRoutes'

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
    service: 'recommendation-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: ['assessment', 'ai-recommendation']
  })
})

// Mount routes
app.route('/api/assessment', assessmentRoutes)
app.route('/api/results', resultRoutes)

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: c.req.path
  }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Service Error:', err)
  return c.json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  }, 500)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down recommendation service...')
  await disconnectRedis()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Shutting down recommendation service...')
  await disconnectRedis()
  process.exit(0)
})

// Initialize connections and start server
async function startServer() {
  try {
    // Connect to Redis
    await connectRedis()

    const port = parseInt(process.env.PORT || '3005')
    console.log(`🚀 Recommendation Service starting on port ${port}`)

    // Start server
    const server = Bun.serve({
      port,
      fetch: app.fetch,
    })

    console.log(`✅ Recommendation Service running at http://localhost:${port}`)
    console.log(`📊 Health check: http://localhost:${port}/health`)

  } catch (error) {
    console.error('❌ Failed to start recommendation service:', error)
    process.exit(1)
  }
}

startServer()