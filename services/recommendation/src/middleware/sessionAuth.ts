/**
 * Session Authentication Middleware
 * Validates session IDs for anonymous assessment access
 */

import type { Context, Next } from 'hono'
import { redisClient } from '../config/redis'

/**
 * Middleware to validate session ID from request
 * Checks if session exists in Redis
 */
export async function sessionAuthMiddleware(c: Context, next: Next) {
  const sessionId = c.req.header('X-Session-ID') || c.req.query('session_id')

  if (!sessionId) {
    return c.json({
      success: false,
      error: {
        code: 'SESSION_MISSING',
        message: 'Session ID is required'
      }
    }, 401)
  }

  try {
    // Check if session exists in Redis
    const sessionData = await redisClient.get(`session:${sessionId}`)

    if (!sessionData) {
      return c.json({
        success: false,
        error: {
          code: 'SESSION_INVALID',
          message: 'Invalid or expired session'
        }
      }, 401)
    }

    // Parse session data and add to context
    const session = JSON.parse(sessionData)
    c.set('sessionId', sessionId)
    c.set('sessionData', session)

    await next()

  } catch (error) {
    console.error('Session validation error:', error)
    return c.json({
      success: false,
      error: {
        code: 'SESSION_ERROR',
        message: 'Session validation failed'
      }
    }, 500)
  }
}