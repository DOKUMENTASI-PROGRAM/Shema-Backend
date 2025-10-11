/**
 * Redis Configuration for API Gateway
 * Used for caching and session management
 */

import { createClient } from 'redis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Redis connection failed after 10 retries')
        return new Error('Redis connection failed')
      }
      return retries * 100 // Exponential backoff
    },
  },
})

redis.on('error', (err) => {
  console.error('Redis Client Error:', err)
})

redis.on('connect', () => {
  console.log('✅ API Gateway connected to Redis')
})

export async function connectRedis() {
  try {
    await redis.connect()
    console.log('🔌 Redis connection established')
  } catch (error) {
    console.error('Failed to connect to Redis:', error)
    throw error
  }
}

export async function disconnectRedis() {
  try {
    await redis.quit()
    console.log('👋 Redis connection closed')
  } catch (error) {
    console.error('Error closing Redis connection:', error)
  }
}
