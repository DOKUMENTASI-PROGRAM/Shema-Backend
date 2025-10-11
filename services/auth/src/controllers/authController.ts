/**
 * Auth Controller
 * Handles authentication logic: register, login, logout, refresh token
 */

import type { Context } from 'hono'
import { z } from 'zod'
import { supabase } from '../config/supabase'
import { redisClient } from '../config/redis'
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password'
import { generateAccessToken, generateRefreshToken } from '../utils/jwt'
import type { User, UserRole, RegisterRequest, LoginRequest, AuthResponse, APIResponse } from '../types'

// Validation Schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.literal('admin'), // Only admin registration allowed
  phone_number: z.string().optional(),
  preferred_instruments: z.array(z.string()).optional(),
  experience_level: z.string().optional(),
  learning_goal: z.string().optional()
})

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

/**
 * POST /register
 * Register new user (student/instructor/admin)
 */
export async function register(c: Context) {
  try {
    // Parse and validate request body
    const body = await c.req.json()
    const validatedData = registerSchema.parse(body)

    // Validate password strength
    const passwordValidation = validatePasswordStrength(validatedData.password)
    if (!passwordValidation.valid) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_PASSWORD_WEAK',
          message: 'Password does not meet security requirements',
          details: passwordValidation.errors
        }
      }, 400)
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', validatedData.email)
      .single()

    if (existingUser) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'DB_DUPLICATE_ENTRY',
          message: 'User with this email already exists'
        }
      }, 409)
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password)

    // Create user in database
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: validatedData.email,
        password_hash: passwordHash,
        full_name: validatedData.full_name,
        role: validatedData.role as UserRole,
        phone_number: validatedData.phone_number
      })
      .select()
      .single()

    if (insertError || !newUser) {
      console.error('Database error:', insertError)
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'DB_QUERY_ERROR',
          message: 'Failed to create user',
          details: insertError?.message
        }
      }, 500)
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role
    })

    const refreshToken = generateRefreshToken({
      userId: newUser.id,
      email: newUser.email
    })

    // Store refresh token in Redis (7 days TTL)
    await redisClient.setEx(
      `refresh_token:${newUser.id}`,
      7 * 24 * 60 * 60, // 7 days in seconds
      refreshToken
    )

    // Remove sensitive data
    const userResponse: User = {
      id: newUser.id,
      email: newUser.email,
      full_name: newUser.full_name,
      role: newUser.role,
      phone_number: newUser.phone_number,
      avatar_url: newUser.avatar_url,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at,
      last_login_at: newUser.last_login_at
    }

    return c.json<APIResponse<AuthResponse>>({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: userResponse
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    }, 201)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.errors
        }
      }, 400)
    }

    console.error('Register error:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500)
  }
}

/**
 * POST /login
 * Authenticate user and return tokens
 */
export async function login(c: Context) {
  try {
    // Parse and validate request body
    const body = await c.req.json()
    const validatedData = loginSchema.parse(body)

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', validatedData.email)
      .single()

    if (userError || !user) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      }, 401)
    }

    // Compare passwords
    const isPasswordValid = await comparePassword(validatedData.password, user.password_hash)

    if (!isPasswordValid) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      }, 401)
    }

    // Update last login timestamp
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email
    })

    // Store refresh token in Redis
    await redisClient.setEx(
      `refresh_token:${user.id}`,
      7 * 24 * 60 * 60,
      refreshToken
    )

    // Remove sensitive data
    const userResponse: User = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone_number: user.phone_number,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login_at: new Date().toISOString()
    }

    return c.json<APIResponse<AuthResponse>>({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: userResponse
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    }, 200)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.errors
        }
      }, 400)
    }

    console.error('Login error:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500)
  }
}

/**
 * POST /refresh
 * Refresh access token using refresh token
 */
export async function refreshToken(c: Context) {
  try {
    const { refreshToken } = await c.req.json()

    if (!refreshToken) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required'
        }
      }, 400)
    }

    // Verify refresh token (will throw if invalid/expired)
    const { verifyRefreshToken } = await import('../utils/jwt')
    const decoded = verifyRefreshToken(refreshToken)

    // Check if refresh token exists in Redis
    const storedToken = await redisClient.get(`refresh_token:${decoded.userId}`)

    if (!storedToken || storedToken !== refreshToken) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'AUTH_INVALID_TOKEN',
          message: 'Invalid refresh token'
        }
      }, 401)
    }

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single()

    if (userError || !user) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'AUTH_UNAUTHORIZED',
          message: 'User not found'
        }
      }, 401)
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    return c.json<APIResponse<{ accessToken: string }>>({
      success: true,
      data: {
        accessToken: newAccessToken
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    }, 200)

  } catch (error) {
    console.error('Refresh token error:', error)
    
    if (error instanceof Error && error.message.includes('AUTH_TOKEN')) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: error.message as any,
          message: 'Token verification failed'
        }
      }, 401)
    }

    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500)
  }
}

/**
 * POST /logout
 * Logout user by invalidating refresh token
 */
export async function logout(c: Context) {
  try {
    const { refreshToken } = await c.req.json()

    if (!refreshToken) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required'
        }
      }, 400)
    }

    // Verify and decode token
    const { verifyRefreshToken } = await import('../utils/jwt')
    const decoded = verifyRefreshToken(refreshToken)

    // Delete refresh token from Redis
    await redisClient.del(`refresh_token:${decoded.userId}`)

    return c.json<APIResponse>({
      success: true,
      data: {
        message: 'Logged out successfully'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    }, 200)

  } catch (error) {
    console.error('Logout error:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500)
  }
}

/**
 * GET /me
 * Get current authenticated user info
 */
export async function getMe(c: Context) {
  try {
    // Get user from context (set by auth middleware)
    const user = c.get('user')

    if (!user) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'AUTH_UNAUTHORIZED',
          message: 'Not authenticated'
        }
      }, 401)
    }

    return c.json<APIResponse<User>>({
      success: true,
      data: user,
      meta: {
        timestamp: new Date().toISOString()
      }
    }, 200)

  } catch (error) {
    console.error('Get me error:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500)
  }
}
