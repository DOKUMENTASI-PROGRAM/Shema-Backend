/**
 * Booking Controller
 * Handles course registration and booking management
 */

import type { Context } from 'hono'
import { z } from 'zod'
import { supabase } from '../config/supabase'
import { redisClient } from '../config/redis'
import type { CourseRegistrationRequest, Booking, APIResponse } from '../types'

// Validation Schema
const courseRegistrationSchema = z.object({
  // Personal Information
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  wa_number: z.string().regex(/^\+62\d{9,12}$/, 'WA number must be in format +62xxxxxxxxxx'),
  email: z.string().email('Invalid email format'),

  // Course Information
  course_id: z.string().uuid('Invalid course ID'),

  // Preferences
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
  time_preferences: z.string().optional(),
  preferred_days: z.array(z.string()).min(1, 'At least one preferred day required'),
  preferred_time_range: z.object({
    start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
  }),
  start_date_target: z.string().optional(),

  // Guardian Information
  guardian: z.object({
    name: z.string().min(2, 'Guardian name required'),
    wa_number: z.string().regex(/^\+62\d{9,12}$/, 'Guardian WA number must be in format +62xxxxxxxxxx')
  }).optional(),

  // Additional Details
  instrument_owned: z.boolean().optional(),
  notes: z.string().optional(),
  referral_source: z.enum(['instagram', 'facebook', 'google', 'tiktok', 'friend', 'website', 'other']).optional(),

  // Consent & Security
  consent: z.boolean().refine(val => val === true, 'Consent is required'),
  captcha_token: z.string().min(1, 'Captcha token is required'),
  idempotency_key: z.string().uuid('Invalid idempotency key')
})

/**
 * POST /register-course
 * Register for a course (creates student account if doesn't exist)
 */
export async function registerCourse(c: Context) {
  try {
    // Parse and validate request body
    const body = await c.req.json()
    const validatedData = courseRegistrationSchema.parse(body)

    // Check idempotency key to prevent duplicate registrations
    const idempotencyKey = `course_registration:${validatedData.idempotency_key}`
    const existingRegistration = await redisClient.get(idempotencyKey)

    if (existingRegistration) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'DUPLICATE_REQUEST',
          message: 'This registration request has already been processed'
        }
      }, 409)
    }

    // Check if user already exists by email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, full_name, role')
      .eq('email', validatedData.email)
      .single()

    let userId: string

    if (existingUser) {
      // User exists, check if they're already a student
      if (existingUser.role !== 'student') {
        return c.json<APIResponse>({
          success: false,
          error: {
            code: 'INVALID_USER_ROLE',
            message: 'User with this email exists but is not a student'
          }
        }, 400)
      }
      userId = existingUser.id
    } else {
      // Create new student account
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email: validatedData.email,
          full_name: validatedData.full_name,
          wa_number: validatedData.wa_number,
          role: 'student',
          auth_provider: 'course_registration'
        })
        .select()
        .single()

      if (userError || !newUser) {
        console.error('User creation error:', userError)
        return c.json<APIResponse>({
          success: false,
          error: {
            code: 'USER_CREATION_FAILED',
            message: 'Failed to create student account'
          }
        }, 500)
      }

      userId = newUser.id

      // Create student profile
      await supabase
        .from('student_profiles')
        .insert({
          user_id: userId,
          preferred_instruments: [], // Will be updated later if needed
          experience_level: validatedData.experience_level,
          learning_goal: validatedData.time_preferences || 'General music learning'
        })
    }

    // Check if course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', validatedData.course_id)
      .single()

    if (courseError || !course) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found'
        }
      }, 404)
    }

    // Check for existing pending booking for this user and course
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('user_id', userId)
      .eq('course_id', validatedData.course_id)
      .eq('status', 'pending')
      .single()

    if (existingBooking) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'PENDING_BOOKING_EXISTS',
          message: 'You already have a pending booking for this course'
        }
      }, 409)
    }

    // Create booking record
    const bookingData = {
      user_id: userId,
      course_id: validatedData.course_id,
      status: 'pending',
      experience_level: validatedData.experience_level,
      preferred_days: validatedData.preferred_days,
      preferred_time_range: validatedData.preferred_time_range,
      start_date_target: validatedData.start_date_target,
      guardian_name: validatedData.guardian?.name,
      guardian_wa_number: validatedData.guardian?.wa_number,
      instrument_owned: validatedData.instrument_owned,
      notes: validatedData.notes,
      referral_source: validatedData.referral_source,
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single()

    if (bookingError || !booking) {
      console.error('Booking creation error:', bookingError)
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'BOOKING_CREATION_FAILED',
          message: 'Failed to create booking'
        }
      }, 500)
    }

    // Store idempotency key in Redis (24 hours)
    await redisClient.setEx(idempotencyKey, 24 * 60 * 60, JSON.stringify({
      booking_id: booking.id,
      user_id: userId,
      course_id: validatedData.course_id
    }))

    // Publish event to Redis for other services
    await redisClient.publish('booking.created', JSON.stringify({
      eventType: 'BOOKING_CREATED',
      bookingId: booking.id,
      userId: userId,
      courseId: validatedData.course_id,
      experienceLevel: validatedData.experience_level,
      preferredDays: validatedData.preferred_days,
      timestamp: new Date().toISOString()
    }))

    return c.json<APIResponse<Booking>>({
      success: true,
      data: booking,
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

    console.error('Course registration error:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500)
  }
}