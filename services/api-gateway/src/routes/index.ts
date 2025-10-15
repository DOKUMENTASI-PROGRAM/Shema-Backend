/**
 * Gateway Routes - Main routing configuration
 * Routes requests to appropriate microservices
 */

import { Hono } from 'hono'
import { proxyToService } from '../utils/proxy'
import { SERVICE_URLS } from '../config/services'
import { authMiddleware, requireRole } from '../middleware/auth'
import {
  aggregateDashboardStats,
  aggregateAdminDashboard,
  aggregateUserProfile,
} from '../utils/aggregator'

const routes = new Hono()

// ============================================
// AUTH SERVICE ROUTES (Public)
// ============================================
routes.post('/auth/register', async (c) => {
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.AUTH_SERVICE,
    path: '/api/auth/register',
  })
})

routes.post('/auth/login', async (c) => {
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.AUTH_SERVICE,
    path: '/api/auth/login',
  })
})

routes.post('/auth/refresh', async (c) => {
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.AUTH_SERVICE,
    path: '/api/auth/refresh',
  })
})

routes.post('/auth/logout', authMiddleware, async (c) => {
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.AUTH_SERVICE,
    path: '/api/auth/logout',
  })
})

// Firebase auth routes
routes.post('/auth/firebase/register', async (c) => {
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.AUTH_SERVICE,
    path: '/api/auth/firebase/register',
  })
})

routes.post('/auth/firebase/login', async (c) => {
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.AUTH_SERVICE,
    path: '/api/auth/firebase/login',
  })
})

routes.get('/auth/firebase/verify/:token', async (c) => {
  const token = c.req.param('token')
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.AUTH_SERVICE,
    path: `/api/auth/firebase/verify/${token}`,
  })
})

// ============================================
// USER SERVICE ROUTES (Protected)
// ============================================
routes.get('/users/me', authMiddleware, async (c) => {
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.USER_SERVICE,
    path: '/api/users/me',
  })
})

routes.get('/users/:id', authMiddleware, async (c) => {
  const userId = c.req.param('id')
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.USER_SERVICE,
    path: `/api/users/${userId}`,
  })
})

routes.put('/users/:id', authMiddleware, async (c) => {
  const userId = c.req.param('id')
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.USER_SERVICE,
    path: `/api/users/${userId}`,
  })
})

routes.get('/users', authMiddleware, requireRole(['admin']), async (c) => {
  const query = c.req.query()
  const queryString = new URLSearchParams(query).toString()
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.USER_SERVICE,
    path: `/api/users${queryString ? '?' + queryString : ''}`,
  })
})

// ============================================
// COURSE SERVICE ROUTES
// ============================================
routes.get('/courses', async (c) => {
  const query = c.req.query()
  const queryString = new URLSearchParams(query).toString()
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.COURSE_SERVICE,
    path: `/api/courses${queryString ? '?' + queryString : ''}`,
  })
})

routes.get('/courses/:id', async (c) => {
  const courseId = c.req.param('id')
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.COURSE_SERVICE,
    path: `/api/courses/${courseId}`,
  })
})

routes.post('/courses', authMiddleware, requireRole(['admin']), async (c) => {
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.COURSE_SERVICE,
    path: '/api/courses',
  })
})

routes.put('/courses/:id', authMiddleware, requireRole(['admin']), async (c) => {
  const courseId = c.req.param('id')
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.COURSE_SERVICE,
    path: `/api/courses/${courseId}`,
  })
})

routes.delete('/courses/:id', authMiddleware, requireRole(['admin']), async (c) => {
  const courseId = c.req.param('id')
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.COURSE_SERVICE,
    path: `/api/courses/${courseId}`,
  })
})

// Schedule routes
routes.get('/schedules/available', async (c) => {
  const query = c.req.query()
  const queryString = new URLSearchParams(query).toString()
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.COURSE_SERVICE,
    path: `/api/schedules/available${queryString ? '?' + queryString : ''}`,
  })
})

// ============================================
// BOOKING SERVICE ROUTES (Protected)
// ============================================
routes.post('/bookings/create', authMiddleware, async (c) => {
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.BOOKING_SERVICE,
    path: '/api/bookings/create',
  })
})

routes.get('/bookings/user/:userId', authMiddleware, async (c) => {
  const userId = c.req.param('userId')
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.BOOKING_SERVICE,
    path: `/api/bookings/user/${userId}`,
  })
})

routes.get('/bookings/pending', authMiddleware, requireRole(['admin']), async (c) => {
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.BOOKING_SERVICE,
    path: '/api/bookings/pending',
  })
})

routes.post('/bookings/:id/confirm', authMiddleware, requireRole(['admin']), async (c) => {
  const bookingId = c.req.param('id')
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.BOOKING_SERVICE,
    path: `/api/bookings/${bookingId}/confirm`,
  })
})

routes.post('/bookings/:id/reject', authMiddleware, requireRole(['admin']), async (c) => {
  const bookingId = c.req.param('id')
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.BOOKING_SERVICE,
    path: `/api/bookings/${bookingId}/reject`,
  })
})

// ============================================
// CHAT SERVICE ROUTES (Protected)
// ============================================
routes.get('/chat/sessions', authMiddleware, async (c) => {
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.CHAT_SERVICE,
    path: '/api/chat/sessions',
  })
})

routes.get('/chat/sessions/:id', authMiddleware, async (c) => {
  const sessionId = c.req.param('id')
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.CHAT_SERVICE,
    path: `/api/chat/sessions/${sessionId}`,
  })
})

routes.get('/chat/active-sessions', authMiddleware, requireRole(['admin']), async (c) => {
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.CHAT_SERVICE,
    path: '/api/chat/active-sessions',
  })
})

// WebSocket connection for chat (handled by Chat Service directly)
// routes.get('/chat/connect', ...) // WebSocket upgrade handled at service level

// ============================================
// RECOMMENDATION SERVICE ROUTES (Protected)
// ============================================
routes.post('/recommendations/generate', authMiddleware, async (c) => {
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.RECOMMENDATION_SERVICE,
    path: '/api/recommendations/generate',
  })
})

routes.get('/recommendations/user/:userId', authMiddleware, async (c) => {
  const userId = c.req.param('userId')
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.RECOMMENDATION_SERVICE,
    path: `/api/recommendations/user/${userId}`,
  })
})

// ============================================
// AGGREGATION ENDPOINTS
// ============================================
routes.get('/dashboard/stats', authMiddleware, requireRole(['admin']), async (c) => {
  return aggregateDashboardStats(c)
})

routes.get('/dashboard/admin', authMiddleware, requireRole(['admin']), async (c) => {
  return aggregateAdminDashboard(c)
})

routes.get('/profile/:userId/full', authMiddleware, async (c) => {
  const userId = c.req.param('userId')
  return aggregateUserProfile(c, userId)
})

// ============================================
// BOOKING SERVICE ROUTES (Public for registration)
// ============================================
routes.post('/booking/register-course', async (c) => {
  return proxyToService(c, {
    serviceUrl: SERVICE_URLS.BOOKING_SERVICE,
    path: '/api/booking/register-course',
  })
})

export default routes
