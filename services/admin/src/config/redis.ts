/**
 * Redis Client for Auth Service
 */

import { createClient } from 'redis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

export const redisClient = createClient({
  url: REDIS_URL
})

redisClient.on('error', (err: Error) => console.error('❌ Redis Error:', err))
redisClient.on('connect', () => console.log('✅ Redis: Connected'))
redisClient.on('ready', () => console.log('✅ Redis: Ready'))

export async function connectRedis() {
  try {
    await redisClient.connect()
    return redisClient
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error)
    throw error
  }
}

export async function disconnectRedis() {
  try {
    await redisClient.quit()
    console.log('✅ Redis: Disconnected')
  } catch (error) {
    console.error('❌ Redis disconnect error:', error)
  }
}

export default redisClient
