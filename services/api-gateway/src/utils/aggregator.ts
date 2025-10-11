/**
 * Aggregator Utilities
 * Handles aggregating data from multiple microservices
 */

import { Context } from 'hono'
import { SERVICE_URLS } from '../config/services'
import { fetchFromMultipleServices } from './proxy'

/**
 * Aggregate dashboard statistics from multiple services
 */
export async function aggregateDashboardStats(c: Context) {
  try {
    const authHeader = c.req.header('Authorization')
    const headers = authHeader ? { Authorization: authHeader } : {}

    const stats = await fetchFromMultipleServices([
      {
        name: 'userStats',
        serviceUrl: SERVICE_URLS.USER_SERVICE,
        path: '/api/users/stats',
        headers,
      },
      {
        name: 'bookingStats',
        serviceUrl: SERVICE_URLS.BOOKING_SERVICE,
        path: '/api/bookings/stats',
        headers,
      },
      {
        name: 'chatStats',
        serviceUrl: SERVICE_URLS.CHAT_SERVICE,
        path: '/api/chat/stats',
        headers,
      },
      {
        name: 'courseStats',
        serviceUrl: SERVICE_URLS.COURSE_SERVICE,
        path: '/api/courses/stats',
        headers,
      },
    ])

    return c.json({
      success: true,
      data: {
        totalStudents: stats.userStats?.data?.total_students || 0,
        pendingBookings: stats.bookingStats?.data?.pending_bookings || 0,
        activeChats: stats.chatStats?.data?.active_chats || 0,
        coursesAvailable: stats.courseStats?.data?.courses_available || 0,
        servicesHealth: {
          userService: !stats.userStats?.error,
          bookingService: !stats.bookingStats?.error,
          chatService: !stats.chatStats?.error,
          courseService: !stats.courseStats?.error,
        },
      },
    })
  } catch (error: any) {
    console.error('Dashboard aggregation error:', error)
    return c.json(
      {
        success: false,
        error: {
          code: 'AGGREGATION_ERROR',
          message: 'Failed to aggregate dashboard data',
          details: error.message,
        },
      },
      500
    )
  }
}

/**
 * Aggregate admin dashboard data (bookings + chats + stats)
 */
export async function aggregateAdminDashboard(c: Context) {
  try {
    const authHeader = c.req.header('Authorization')
    const headers = authHeader ? { Authorization: authHeader } : {}

    const dashboardData = await fetchFromMultipleServices([
      {
        name: 'pendingBookings',
        serviceUrl: SERVICE_URLS.BOOKING_SERVICE,
        path: '/api/bookings/pending',
        headers,
      },
      {
        name: 'activeSessions',
        serviceUrl: SERVICE_URLS.CHAT_SERVICE,
        path: '/api/chat/active-sessions',
        headers,
      },
      {
        name: 'stats',
        serviceUrl: SERVICE_URLS.USER_SERVICE,
        path: '/api/users/stats',
        headers,
      },
    ])

    return c.json({
      success: true,
      data: {
        pendingBookings: dashboardData.pendingBookings?.data || [],
        activeChatSessions: dashboardData.activeSessions?.data || [],
        statistics: dashboardData.stats?.data || {},
        servicesHealth: {
          bookingService: !dashboardData.pendingBookings?.error,
          chatService: !dashboardData.activeSessions?.error,
          userService: !dashboardData.stats?.error,
        },
      },
    })
  } catch (error: any) {
    console.error('Admin dashboard aggregation error:', error)
    return c.json(
      {
        success: false,
        error: {
          code: 'AGGREGATION_ERROR',
          message: 'Failed to aggregate admin dashboard data',
          details: error.message,
        },
      },
      500
    )
  }
}

/**
 * Aggregate user profile with related data
 */
export async function aggregateUserProfile(c: Context, userId: string) {
  try {
    const authHeader = c.req.header('Authorization')
    const headers = authHeader ? { Authorization: authHeader } : {}

    const userData = await fetchFromMultipleServices([
      {
        name: 'profile',
        serviceUrl: SERVICE_URLS.USER_SERVICE,
        path: `/api/users/${userId}`,
        headers,
      },
      {
        name: 'bookings',
        serviceUrl: SERVICE_URLS.BOOKING_SERVICE,
        path: `/api/bookings/user/${userId}`,
        headers,
      },
      {
        name: 'recommendations',
        serviceUrl: SERVICE_URLS.RECOMMENDATION_SERVICE,
        path: `/api/recommendations/user/${userId}`,
        headers,
      },
    ])

    return c.json({
      success: true,
      data: {
        profile: userData.profile?.data || null,
        bookings: userData.bookings?.data || [],
        recommendations: userData.recommendations?.data || [],
        servicesHealth: {
          userService: !userData.profile?.error,
          bookingService: !userData.bookings?.error,
          recommendationService: !userData.recommendations?.error,
        },
      },
    })
  } catch (error: any) {
    console.error('User profile aggregation error:', error)
    return c.json(
      {
        success: false,
        error: {
          code: 'AGGREGATION_ERROR',
          message: 'Failed to aggregate user profile data',
          details: error.message,
        },
      },
      500
    )
  }
}
