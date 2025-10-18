/**
 * Documentation Service - Comprehensive API Documentation
 * Serves detailed HTML/CSS documentation for Shema Music Backend
 * Port: 3007
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/bun'
import { connectRedis, disconnectRedis } from './config/redis'

const app = new Hono()

// Middleware
app.use('*', logger())

// CORS Configuration
const corsOrigin = process.env.NODE_ENV === 'development'
  ? '*'
  : (process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'])

app.use('*', cors({
  origin: corsOrigin,
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 86400,
}))

// Initialize Redis connection (optional for documentation service)
let redisConnected = false
async function initRedis() {
  try {
    console.log(' Connecting to Redis...')
    await connectRedis()
    redisConnected = true
    console.log(' Documentation Service connected to Redis')
  } catch (error) {
    console.warn('  Redis connection failed, continuing without Redis:', error instanceof Error ? error.message : String(error))
    redisConnected = false
  }
}

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    service: 'documentation-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    type: 'web-documentation'
  })
})

// API Info endpoint
app.get('/api/info', (c) => {
  return c.json({
    title: 'Shema Music API Documentation',
    version: '1.0.0',
    description: 'Complete API documentation for Shema Music Backend services',
    services: [
      {
        name: 'API Gateway',
        port: 3000,
        description: 'Main entry point for all API requests',
        status: 'healthy'
      },
      {
        name: 'Auth Service',
        port: 3001,
        description: 'Authentication and user management',
        status: 'healthy'
      },
      {
        name: 'Admin Service',
        port: 3002,
        description: 'Administrative operations',
        status: 'healthy'
      },
      {
        name: 'Course Service',
        port: 3003,
        description: 'Course management and content',
        status: 'healthy'
      },
      {
        name: 'Booking Service',
        port: 3004,
        description: 'Course registration and booking management',
        status: 'healthy'
      },
      {
        name: 'Recommendation Service',
        port: 3005,
        description: 'AI-powered assessment and music recommendations',
        status: 'healthy'
      }
    ],
    baseUrl: 'http://localhost:3000',
    documentation: 'http://localhost:3007',
    environment: process.env.NODE_ENV || 'development'
  })
})

// Serve static files from public directory
app.use('/*', serveStatic({ root: './public' }))

// 404 handler
app.notFound((c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page Not Found</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
            padding: 20px;
        }
        .container {
            max-width: 600px;
        }
        h1 {
            font-size: 6rem;
            margin-bottom: 1rem;
            font-weight: 800;
        }
        h2 {
            font-size: 2rem;
            margin-bottom: 1rem;
            font-weight: 600;
        }
        p {
            font-size: 1.125rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }
        a {
            display: inline-block;
            padding: 12px 32px;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        a:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <a href="/">← Back to Documentation</a>
    </div>
</body>
</html>
  `)
})

// Error handler
app.onError((err, c) => {
  console.error('Error:', err)
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
    await initRedis()

    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   📖 Documentation Service - Shema Music Backend          ║
║                                                            ║
║   Port: ${PORT}                                              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                                   ║
║   Status: ✅ Running                                       ║
║                                                            ║
║   📚 Documentation: http://localhost:${PORT}                 ║
║   🏥 Health Check: http://localhost:${PORT}/health          ║
║   ℹ️  API Info: http://localhost:${PORT}/api/info           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `)
  } catch (error) {
    console.error('❌ Failed to start Documentation Service:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n Shutting down Documentation Service...')
  if (redisConnected) {
    await disconnectRedis()
  }
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n Shutting down Documentation Service...')
  if (redisConnected) {
    await disconnectRedis()
  }
  process.exit(0)
})

// Start the service
start()

export default {
  port: PORT,
  fetch: app.fetch
}
