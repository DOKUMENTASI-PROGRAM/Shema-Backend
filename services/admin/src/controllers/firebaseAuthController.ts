/**
 * Firebase Auth Controller
 * Handles Firebase authentication for Admin users only
 */

import type { Context } from 'hono'
import { z } from 'zod'
import { supabase } from '../config/supabase'
import { 
  verifyFirebaseToken, 
  createFirebaseUser,
  generatePasswordResetLink,
  getFirebaseUserByEmail,
  initializeFirebase
} from '../config/firebase'
import { redisClient } from '../config/redis'
import type { User, APIResponse } from '../types'

// Initialize Firebase on module load (optional)
let firebaseApp: any = null
try {
  firebaseApp = initializeFirebase()
  if (!firebaseApp) {
    console.warn('⚠️  Firebase not available, Firebase auth endpoints will not work')
  }
} catch (error) {
  console.warn('⚠️  Firebase initialization failed in admin controller:', error instanceof Error ? error.message : String(error))
  firebaseApp = null
}

// Validation Schemas
const firebaseLoginSchema = z.object({
  idToken: z.string().min(1, 'Firebase ID token is required')
})

const firebaseRegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone_number: z.string().optional()
})

const passwordResetSchema = z.object({
  email: z.string().email('Invalid email format')
})

/**
 * Firebase Login (Admin Only)
 * 
 * Flow:
 * 1. Client logs in via Firebase Auth on frontend
 * 2. Client sends Firebase ID token to backend
 * 3. Backend verifies token with Firebase Admin SDK
 * 4. Backend checks/creates user in Supabase
 * 5. Backend returns user data
 * 
 * @route POST /api/auth/firebase/login
 */
export async function firebaseLogin(c: Context): Promise<Response> {
  try {
    // Validate request body
    const body = await c.req.json()
    const validatedData = firebaseLoginSchema.parse(body)

    // Verify Firebase ID token
    const firebaseUser = await verifyFirebaseToken(validatedData.idToken)

    // Check if user exists in Supabase
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUser.uid)
      .single()

    let user: User

    if (fetchError || !existingUser) {
      // Create user in Supabase if not exists
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: firebaseUser.email!,
          full_name: firebaseUser.email!.split('@')[0], // Default name from email
          firebase_uid: firebaseUser.uid,
          role: firebaseUser.role || 'admin', // Default to admin for Firebase users
          email_verified: firebaseUser.emailVerified,
          provider: firebaseUser.provider,
          auth_provider: 'firebase'
        })
        .select()
        .single()

      if (createError) {
        console.error('Failed to create user in Supabase:', createError)
        return c.json<APIResponse>({
          success: false,
          error: {
            code: 'DB_CREATE_ERROR',
            message: 'Failed to create user',
            details: createError.message
          }
        }, 500)
      }

      user = newUser as User
    } else {
      // Update last login
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ 
          last_login_at: new Date().toISOString(),
          email_verified: firebaseUser.emailVerified
        })
        .eq('id', existingUser.id)
        .select()
        .single()

      if (updateError) {
        console.error('Failed to update last login:', updateError)
      }

      user = (updatedUser || existingUser) as User
    }

    // Store Firebase UID in Redis for quick lookups (optional)
    await redisClient.setEx(
      `firebase_uid:${firebaseUser.uid}`,
      7 * 24 * 60 * 60, // 7 days
      user.id
    )

    return c.json<APIResponse>({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          phone_number: user.phone_number,
          avatar_url: user.avatar_url,
          emailVerified: firebaseUser.emailVerified
        },
        firebaseUid: firebaseUser.uid,
        provider: firebaseUser.provider
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('Firebase login error:', error)

    if (error instanceof z.ZodError) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      }, 400)
    }

    if (error.message?.includes('AUTH_FIREBASE_TOKEN')) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: error.message,
          message: 'Firebase authentication failed',
          details: 'Invalid or expired Firebase ID token'
        }
      }, 401)
    }

    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'FIREBASE_LOGIN_ERROR',
        message: 'Firebase login failed',
        details: error.message
      }
    }, 500)
  }
}

/**
 * Register Admin via Firebase
 * 
 * This creates a Firebase user and stores in Supabase
 * Only for admin registration
 * 
 * @route POST /api/auth/firebase/register
 */
export async function firebaseRegister(c: Context): Promise<Response> {
  try {
    const body = await c.req.json()
    const validatedData = firebaseRegisterSchema.parse(body)

    // Check if user already exists in Supabase
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', validatedData.email)
      .single()

    if (existingUser) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'AUTH_EMAIL_ALREADY_EXISTS',
          message: 'User with this email already exists'
        }
      }, 409)
    }

    // Create Firebase user
    const firebaseUser = await createFirebaseUser(
      validatedData.email,
      validatedData.password,
      validatedData.full_name,
      'admin'
    )

    // Create user in Supabase
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: validatedData.email,
        full_name: validatedData.full_name,
        firebase_uid: firebaseUser.uid,
        role: 'admin',
        phone_number: validatedData.phone_number,
        email_verified: false,
        provider: 'password',
        auth_provider: 'firebase'
      })
      .select()
      .single()

    if (createError) {
      console.error('Failed to create user in Supabase:', createError)
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'DB_CREATE_ERROR',
          message: 'Failed to create user',
          details: createError.message
        }
      }, 500)
    }

    return c.json<APIResponse>({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name,
          role: newUser.role,
          phone_number: newUser.phone_number
        },
        firebaseUid: firebaseUser.uid,
        message: 'Admin user created. Please verify email before logging in.'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    }, 201)

  } catch (error: any) {
    console.error('Firebase register error:', error)

    if (error instanceof z.ZodError) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      }, 400)
    }

    if (error.message === 'AUTH_EMAIL_ALREADY_EXISTS') {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'AUTH_EMAIL_ALREADY_EXISTS',
          message: 'Email already registered in Firebase'
        }
      }, 409)
    }

    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'FIREBASE_REGISTER_ERROR',
        message: 'Firebase registration failed',
        details: error.message
      }
    }, 500)
  }
}

/**
 * Request Password Reset
 * 
 * Generates a password reset link and sends via email
 * 
 * @route POST /api/auth/firebase/reset-password
 */
export async function requestPasswordReset(c: Context): Promise<Response> {
  try {
    const body = await c.req.json()
    const validatedData = passwordResetSchema.parse(body)

    // Check if user exists in Firebase
    try {
      await getFirebaseUserByEmail(validatedData.email)
    } catch (error) {
      // Don't reveal if email exists or not (security best practice)
      return c.json<APIResponse>({
        success: true,
        data: {
          message: 'If the email exists, a password reset link has been sent.'
        }
      })
    }

    // Generate password reset link
    const resetLink = await generatePasswordResetLink(validatedData.email)

    // In production, send this via email service
    // For now, just log it
    console.log(`🔗 Password reset link for ${validatedData.email}:`)
    console.log(resetLink)

    return c.json<APIResponse>({
      success: true,
      data: {
        message: 'Password reset link has been sent to your email.',
        // Remove this in production!
        resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
      }
    })

  } catch (error: any) {
    console.error('Password reset error:', error)

    if (error instanceof z.ZodError) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
          details: error.errors
        }
      }, 400)
    }

    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'PASSWORD_RESET_ERROR',
        message: 'Failed to send password reset link',
        details: error.message
      }
    }, 500)
  }
}
