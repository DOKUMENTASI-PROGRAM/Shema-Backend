/**
 * JWT Authentication Middleware
 * Verify JWT tokens and attach user to context
 */

import type { Context, Next } from 'hono'
import { verifyAccessToken } from '../utils/jwt'
import { supabase } from '../config/supabase'
import type { User, UserRole, APIResponse } from '../types'

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
    const decoded = verifyAccessToken(token)

    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single()

    if (error || !user) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'AUTH_UNAUTHORIZED',
          message: 'User not found'
        }
      }, 401)
    }

    // Attach user to context
    const userResponse: User = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone_number: user.phone_number,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login_at: user.last_login_at
    }

    c.set('user', userResponse)
    c.set('userId', user.id)
    c.set('userRole', user.role)

    await next()

  } catch (error) {
    console.error('Auth middleware error:', error)

    if (error instanceof Error && error.message === 'AUTH_TOKEN_EXPIRED') {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Access token has expired. Please refresh your token.'
        }
      }, 401)
    }

    if (error instanceof Error && error.message === 'AUTH_INVALID_TOKEN') {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'AUTH_INVALID_TOKEN',
          message: 'Invalid access token'
        }
      }, 401)
    }

    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'AUTH_UNAUTHORIZED',
        message: 'Authentication failed'
      }
    }, 401)
  }
}

/**
 * Role-based authorization middleware factory
 * Requires user to have one of the specified roles
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (c: Context, next: Next) => {
    const userRole = c.get('userRole') as UserRole

    if (!userRole) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'AUTH_UNAUTHORIZED',
          message: 'Authentication required'
        }
      }, 401)
    }

    if (!allowedRoles.includes(userRole)) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'AUTH_FORBIDDEN',
          message: `Access forbidden. Required roles: ${allowedRoles.join(', ')}`
        }
      }, 403)
    }

    await next()
  }
}
