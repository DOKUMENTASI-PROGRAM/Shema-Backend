/**
 * Shared Redis Client Configuration
 * Used for session management, caching, and pub/sub
 */

import { createClient } from 'redis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

export const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Redis: Max reconnection attempts reached')
        return new Error('Max reconnection attempts reached')
      }
      const delay = Math.min(retries * 100, 3000)
      console.log(`🔄 Redis: Reconnecting in ${delay}ms...`)
      return delay
    }
  }
})

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err)
})

redisClient.on('connect', () => {
  console.log('✅ Redis: Connected')
})

redisClient.on('ready', () => {
  console.log('✅ Redis: Ready')
})

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis: Reconnecting...')
})

// Connect to Redis
export async function connectRedis() {
  try {
    await redisClient.connect()
    return redisClient
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error)
    throw error
  }
}

// Graceful shutdown
export async function disconnectRedis() {
  try {
    await redisClient.quit()
    console.log('✅ Redis: Disconnected gracefully')
  } catch (error) {
    console.error('❌ Redis: Error during disconnect:', error)
  }
}

export default redisClient
