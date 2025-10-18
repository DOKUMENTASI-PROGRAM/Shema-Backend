/**
 * Auth Service - Main Entry Point
 * Authentication & Authorization Microservice for Shema Music Backend
 * Port: 3001
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { connectRedis, disconnectRedis } from './config/redis'
import { initializeFirebase } from './config/firebase'
import authRoutes from './routes/authRoutes'
import firebaseAuthRoutes from './routes/firebaseAuthRoutes'

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
    service: 'auth-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    authMethods: ['jwt', 'firebase']
  })
})

// Mount auth routes
app.route('/api/auth', authRoutes)
app.route('/api/auth/firebase', firebaseAuthRoutes)

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
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
const PORT = process.env.PORT || 3001

async function start() {
  try {
    // Initialize Firebase Admin SDK (optional)
    console.log('🔥 Initializing Firebase Admin SDK...')
    const firebaseApp = initializeFirebase()
    if (firebaseApp) {
      console.log('✅ Firebase Admin SDK initialized')
    } else {
      console.log('⚠️  Firebase Admin SDK not available (service account file missing)')
    }
    
    // Connect to Redis
    console.log('🔄 Connecting to Redis...')
    await connectRedis()
    
    console.log(`🚀 Auth Service starting on port ${PORT}...`)
    console.log(`📍 Health check: http://localhost:${PORT}/health`)
    console.log(`🔐 JWT Auth: http://localhost:${PORT}/api/auth/*`)
    if (firebaseApp) {
      console.log(`🔥 Firebase Auth: http://localhost:${PORT}/api/auth/firebase/*`)
    }
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
    
  } catch (error) {
    console.error('❌ Failed to start Auth Service:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Auth Service...')
  await disconnectRedis()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down Auth Service...')
  await disconnectRedis()
  process.exit(0)
})

// Start the service
start()

export default {
  port: PORT,
  fetch: app.fetch
}
