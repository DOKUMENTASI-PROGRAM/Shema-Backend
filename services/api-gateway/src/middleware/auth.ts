/**
 * Authentication Middleware for API Gateway
 * Validates JWT tokens for protected routes
 */

import { Context, Next } from 'hono'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface JWTPayload {
  userId: string
  email: string
  role: 'student' | 'teacher' | 'admin'
  iat: number
  exp: number
}

/**
 * Middleware to verify JWT token
 */
export async function authMiddleware(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization')

    if (!authHeader) {
      return c.json(
        {
          success: false,
          error: {
            code: 'AUTH_MISSING_TOKEN',
            message: 'Authorization header is required',
          },
        },
        401
      )
    }

    // Check Bearer token format
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return c.json(
        {
          success: false,
          error: {
            code: 'AUTH_INVALID_FORMAT',
            message: 'Authorization header must be in format: Bearer <token>',
          },
        },
        401
      )
    }

    const token = parts[1]

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
      
      // Attach user info to context for use in routes
      c.set('user', decoded)
      c.set('userId', decoded.userId)
      c.set('userRole', decoded.role)

      await next()
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        return c.json(
          {
            success: false,
            error: {
              code: 'AUTH_TOKEN_EXPIRED',
              message: 'Token has expired',
            },
          },
          401
        )
      }

      if (jwtError.name === 'JsonWebTokenError') {
        return c.json(
          {
            success: false,
            error: {
              code: 'AUTH_INVALID_TOKEN',
              message: 'Invalid token',
            },
          },
          401
        )
      }

      throw jwtError
    }
  } catch (error: any) {
    console.error('Auth middleware error:', error)
    return c.json(
      {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication error',
          details: error.message,
        },
      },
      500
    )
  }
}

/**
 * Middleware to check user role
 */
export function requireRole(allowedRoles: Array<'student' | 'teacher' | 'admin'>) {
  return async (c: Context, next: Next) => {
    const userRole = c.get('userRole') as string

    if (!userRole) {
      return c.json(
        {
          success: false,
          error: {
            code: 'AUTH_NO_ROLE',
            message: 'User role not found. Please authenticate first.',
          },
        },
        401
      )
    }

    if (!allowedRoles.includes(userRole as any)) {
      return c.json(
        {
          success: false,
          error: {
            code: 'AUTH_FORBIDDEN',
            message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
            userRole,
          },
        },
        403
      )
    }

    await next()
  }
}

/**
 * Optional auth middleware - doesn't fail if no token provided
 */
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (authHeader) {
    const parts = authHeader.split(' ')
    if (parts.length === 2 && parts[0] === 'Bearer') {
      try {
        const decoded = jwt.verify(parts[1], JWT_SECRET) as JWTPayload
        c.set('user', decoded)
        c.set('userId', decoded.userId)
        c.set('userRole', decoded.role)
      } catch {
        // Invalid token, but we don't fail - just continue without user
      }
    }
  }

  await next()
}
