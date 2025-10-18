/**
 * JWT Authentication Middleware for Booking Service
 * Verify JWT tokens and attach user to context
 */

import type { Context, Next } from 'hono'
import type { APIResponse } from '../types'

// Dynamic import for jsonwebtoken to avoid Bun issues
let jwtVerify: any = null

async function loadJWT() {
  if (!jwtVerify) {
    try {
      const jwt = await import('jsonwebtoken')
      jwtVerify = jwt.verify
    } catch (error) {
      console.error('Failed to load jsonwebtoken:', error)
      throw error
    }
  }
  return jwtVerify
}

export interface JWTPayload {
  userId: string
  email: string
  role: string
  iat: number
  exp: number
}

/**
 * Middleware to verify JWT and attach user to context
 */
export async function authMiddleware(c: Context, next: Next) {
  try {
    // Get token from Authorization header
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'AUTH_MISSING_TOKEN',
          message: 'Authorization token required'
        }
      }, 401)
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'
    const verify = await loadJWT()
    const decoded = verify(token, jwtSecret) as JWTPayload

    // Attach user info to context
    c.set('userId', decoded.userId)
    c.set('userEmail', decoded.email)
    c.set('userRole', decoded.role)

    await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'AUTH_INVALID_TOKEN',
        message: 'Invalid or expired token'
      }
    }, 401)
  }
}

/**
 * Middleware to require specific roles
 */
export function requireRole(...allowedRoles: string[]) {
  return async function roleMiddleware(c: Context, next: Next) {
    const userRole = c.get('userRole')

    if (!userRole || !allowedRoles.includes(userRole)) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'AUTH_INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions'
        }
      }, 403)
    }

    await next()
  }
}