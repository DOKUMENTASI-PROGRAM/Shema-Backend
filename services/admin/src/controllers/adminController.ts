/**
 * Admin Controller
 * Handles admin-specific operations like dashboard stats, user management, etc.
 */

import type { Context } from 'hono'
import { supabase } from '../config/supabase'
import type { APIResponse } from '../types'

/**
 * GET /dashboard - Get admin dashboard statistics
 */
export async function getDashboardStats(c: Context) {
  try {
    // Get user statistics
    const { data: userStats, error: userError } = await supabase
      .rpc('get_user_stats')

    if (userError) throw userError

    // Get course statistics
    const { data: courseStats, error: courseError } = await supabase
      .rpc('get_course_stats')

    if (courseError) throw courseError

    // Get booking statistics
    const { data: bookingStats, error: bookingError } = await supabase
      .rpc('get_booking_stats')

    if (bookingError) throw bookingError

    // Get recent activities
    const { data: recentBookings, error: recentError } = await supabase
      .from('booking.bookings')
      .select(`
        *,
        course:course_id (
          title,
          instructor_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentError) throw recentError

    return c.json<APIResponse>({
      success: true,
      data: {
        userStats,
        courseStats,
        bookingStats,
        recentBookings
      }
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch dashboard statistics'
      }
    }, 500)
  }
}

/**
 * GET /users - List all users (Admin only)
 */
export async function getUsers(c: Context) {
  try {
    const query = c.req.query()
    const page = parseInt(query.page || '1')
    const limit = parseInt(query.limit || '20')
    const offset = (page - 1) * limit

    const { data: users, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) throw error

    return c.json<APIResponse>({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch users'
      }
    }, 500)
  }
}

/**
 * GET /users/:id - Get user details
 */
export async function getUserById(c: Context) {
  try {
    const userId = c.req.param('id')

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *,
        bookings:booking.bookings (
          id,
          status,
          created_at,
          course:course_id (
            title,
            instructor_name
          )
        )
      `)
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json<APIResponse>({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found'
          }
        }, 404)
      }
      throw error
    }

    return c.json<APIResponse>({
      success: true,
      data: user
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch user'
      }
    }, 500)
  }
}

/**
 * PUT /users/:id - Update user
 */
export async function updateUser(c: Context) {
  try {
    const userId = c.req.param('id')
    const body = await c.req.json()

    const { data: user, error } = await supabase
      .from('users')
      .update(body)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json<APIResponse>({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found'
          }
        }, 404)
      }
      throw error
    }

    return c.json<APIResponse>({
      success: true,
      data: user
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update user'
      }
    }, 500)
  }
}

/**
 * DELETE /users/:id - Delete user
 */
export async function deleteUser(c: Context) {
  try {
    const userId = c.req.param('id')

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) throw error

    return c.json<APIResponse>({
      success: true,
      data: { message: 'User deleted successfully' }
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete user'
      }
    }, 500)
  }
}

/**
 * GET /courses - List all courses for admin
 */
export async function getCourses(c: Context) {
  try {
    const { data: courses, error } = await supabase
      .from('course.courses')
      .select(`
        *,
        instructor:instructor_id (
          name,
          email
        ),
        bookings:booking.bookings (
          id,
          status,
          user_id
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return c.json<APIResponse>({
      success: true,
      data: courses
    })
  } catch (error) {
    console.error('Error fetching courses:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch courses'
      }
    }, 500)
  }
}

/**
 * GET /bookings - List all bookings for admin
 */
export async function getBookings(c: Context) {
  try {
    const query = c.req.query()
    const status = query.status
    const page = parseInt(query.page || '1')
    const limit = parseInt(query.limit || '20')
    const offset = (page - 1) * limit

    let queryBuilder = supabase
      .from('booking.bookings')
      .select(`
        *,
        user:users (
          name,
          email
        ),
        course:course_id (
          title,
          instructor_name
        )
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (status) {
      queryBuilder = queryBuilder.eq('status', status)
    }

    const { data: bookings, error, count } = await queryBuilder

    if (error) throw error

    return c.json<APIResponse>({
      success: true,
      data: {
        bookings,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
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
 * POST /courses/:id/approve - Approve course
 */
export async function approveCourse(c: Context) {
  try {
    const courseId = c.req.param('id')

    const { data: course, error } = await supabase
      .from('course.courses')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .eq('status', 'pending')
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json<APIResponse>({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Course not found or already processed'
          }
        }, 404)
      }
      throw error
    }

    return c.json<APIResponse>({
      success: true,
      data: {
        course,
        message: 'Course approved successfully'
      }
    })
  } catch (error) {
    console.error('Error approving course:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to approve course'
      }
    }, 500)
  }
}

/**
 * POST /courses/:id/reject - Reject course
 */
export async function rejectCourse(c: Context) {
  try {
    const courseId = c.req.param('id')
    const body = await c.req.json()
    const rejectionReason = body.rejection_reason

    const { data: course, error } = await supabase
      .from('course.courses')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        rejected_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .eq('status', 'pending')
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json<APIResponse>({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Course not found or already processed'
          }
        }, 404)
      }
      throw error
    }

    return c.json<APIResponse>({
      success: true,
      data: {
        course,
        message: 'Course rejected successfully'
      }
    })
  } catch (error) {
    console.error('Error rejecting course:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to reject course'
      }
    }, 500)
  }
}