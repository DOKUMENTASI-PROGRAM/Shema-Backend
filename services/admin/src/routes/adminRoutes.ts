/**
 * Admin Routes
 * Define all admin-specific routes
 */

import { Hono } from 'hono'
import {
  getDashboardStats,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getCourses,
  getBookings,
  approveCourse,
  rejectCourse
} from '../controllers/adminController'
import { authMiddleware, requireRole } from '../middleware/authMiddleware'

const adminRoutes = new Hono()

// All admin routes require authentication and admin role
adminRoutes.use('*', authMiddleware)
adminRoutes.use('*', requireRole('admin'))

// Dashboard
adminRoutes.get('/dashboard', getDashboardStats)

// User management
adminRoutes.get('/users', getUsers)
adminRoutes.get('/users/:id', getUserById)
adminRoutes.put('/users/:id', updateUser)
adminRoutes.delete('/users/:id', deleteUser)

// Course management
adminRoutes.get('/courses', getCourses)
adminRoutes.post('/courses/:id/approve', approveCourse)
adminRoutes.post('/courses/:id/reject', rejectCourse)

// Booking management
adminRoutes.get('/bookings', getBookings)

export default adminRoutes