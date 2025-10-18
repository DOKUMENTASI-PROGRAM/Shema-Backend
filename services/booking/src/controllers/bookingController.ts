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

/**
 * GET /bookings - List all bookings (Admin only)
 */
export async function getBookings(c: Context) {
  try {
    const { data: bookings, error } = await supabase
      .from('booking.bookings')
      .select(`
        *,
        course:course_id (
          id,
          title,
          instructor_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return c.json<APIResponse>({
      success: true,
      data: bookings
    })
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch bookings'
      }
    }, 500)
  }
}

/**
 * POST /bookings - Create new booking
 */
export async function createBooking(c: Context) {
  try {
    const body = await c.req.json()
    const userId = c.get('userId') // From auth middleware

    const { data: booking, error } = await supabase
      .from('booking.bookings')
      .insert({
        ...body,
        user_id: userId,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    return c.json<APIResponse>({
      success: true,
      data: booking
    }, 201)
  } catch (error) {
    console.error('Error creating booking:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create booking'
      }
    }, 500)
  }
}

/**
 * GET /bookings/:id - Get booking by ID
 */
export async function getBookingById(c: Context) {
  try {
    const bookingId = c.req.param('id')
    const userId = c.get('userId')
    const userRole = c.get('userRole')

    let query = supabase
      .from('booking.bookings')
      .select(`
        *,
        course:course_id (
          id,
          title,
          instructor_name
        )
      `)
      .eq('id', bookingId)

    // Users can only see their own bookings unless they're admin
    if (userRole !== 'admin') {
      query = query.eq('user_id', userId)
    }

    const { data: booking, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json<APIResponse>({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Booking not found'
          }
        }, 404)
      }
      throw error
    }

    return c.json<APIResponse>({
      success: true,
      data: booking
    })
  } catch (error) {
    console.error('Error fetching booking:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch booking'
      }
    }, 500)
  }
}

/**
 * PUT /bookings/:id - Update booking
 */
export async function updateBooking(c: Context) {
  try {
    const bookingId = c.req.param('id')
    const body = await c.req.json()
    const userId = c.get('userId')
    const userRole = c.get('userRole')

    // Check if booking exists and user has permission
    const { data: existingBooking, error: fetchError } = await supabase
      .from('booking.bookings')
      .select('user_id')
      .eq('id', bookingId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return c.json<APIResponse>({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Booking not found'
          }
        }, 404)
      }
      throw fetchError
    }

    // Users can only update their own bookings unless they're admin
    if (userRole !== 'admin' && existingBooking.user_id !== userId) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only update your own bookings'
        }
      }, 403)
    }

    const { data: booking, error } = await supabase
      .from('booking.bookings')
      .update(body)
      .eq('id', bookingId)
      .select()
      .single()

    if (error) throw error

    return c.json<APIResponse>({
      success: true,
      data: booking
    })
  } catch (error) {
    console.error('Error updating booking:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update booking'
      }
    }, 500)
  }
}

/**
 * DELETE /bookings/:id - Delete booking
 */
export async function deleteBooking(c: Context) {
  try {
    const bookingId = c.req.param('id')
    const userId = c.get('userId')
    const userRole = c.get('userRole')

    // Check if booking exists and user has permission
    const { data: existingBooking, error: fetchError } = await supabase
      .from('booking.bookings')
      .select('user_id, status')
      .eq('id', bookingId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return c.json<APIResponse>({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Booking not found'
          }
        }, 404)
      }
      throw fetchError
    }

    // Users can only delete their own bookings unless they're admin
    if (userRole !== 'admin' && existingBooking.user_id !== userId) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete your own bookings'
        }
      }, 403)
    }

    // Only allow deletion of pending bookings
    if (existingBooking.status !== 'pending') {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Only pending bookings can be deleted'
        }
      }, 400)
    }

    const { error } = await supabase
      .from('booking.bookings')
      .delete()
      .eq('id', bookingId)

    if (error) throw error

    return c.json<APIResponse>({
      success: true,
      data: { message: 'Booking deleted successfully' }
    })
  } catch (error) {
    console.error('Error deleting booking:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete booking'
      }
    }, 500)
  }
}

/**
 * GET /user/:userId - Get user bookings
 */
export async function getUserBookings(c: Context) {
  try {
    const userId = c.req.param('userId')
    const currentUserId = c.get('userId')
    const userRole = c.get('userRole')

    // Users can only see their own bookings unless they're admin
    if (userRole !== 'admin' && userId !== currentUserId) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only view your own bookings'
        }
      }, 403)
    }

    const { data: bookings, error } = await supabase
      .from('booking.bookings')
      .select(`
        *,
        course:course_id (
          id,
          title,
          instructor_name
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return c.json<APIResponse>({
      success: true,
      data: bookings
    })
  } catch (error) {
    console.error('Error fetching user bookings:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch user bookings'
      }
    }, 500)
  }
}

/**
 * POST /:id/confirm - Confirm booking (Admin only)
 */
export async function confirmBooking(c: Context) {
  try {
    const bookingId = c.req.param('id')

    const { data: booking, error } = await supabase
      .from('booking.bookings')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .eq('status', 'pending') // Only confirm pending bookings
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json<APIResponse>({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Booking not found or already processed'
          }
        }, 404)
      }
      throw error
    }

    return c.json<APIResponse>({
      success: true,
      data: {
        booking,
        message: 'Booking confirmed successfully'
      }
    })
  } catch (error) {
    console.error('Error confirming booking:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to confirm booking'
      }
    }, 500)
  }
}

/**
 * POST /:id/cancel - Cancel booking
 */
export async function cancelBooking(c: Context) {
  try {
    const bookingId = c.req.param('id')
    const userId = c.get('userId')
    const userRole = c.get('userRole')

    // Check if booking exists and user has permission
    const { data: existingBooking, error: fetchError } = await supabase
      .from('booking.bookings')
      .select('user_id, status')
      .eq('id', bookingId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return c.json<APIResponse>({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Booking not found'
          }
        }, 404)
      }
      throw fetchError
    }

    // Users can only cancel their own bookings unless they're admin
    if (userRole !== 'admin' && existingBooking.user_id !== userId) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only cancel your own bookings'
        }
      }, 403)
    }

    // Only allow cancellation of pending or confirmed bookings
    if (!['pending', 'confirmed'].includes(existingBooking.status)) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Booking cannot be cancelled at this stage'
        }
      }, 400)
    }

    const { data: booking, error } = await supabase
      .from('booking.bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single()

    if (error) throw error

    return c.json<APIResponse>({
      success: true,
      data: {
        booking,
        message: 'Booking cancelled successfully'
      }
    })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to cancel booking'
      }
    }, 500)
  }
}