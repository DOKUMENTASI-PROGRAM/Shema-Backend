/**
 * Booking Routes
 * Define all booking-related routes
 */

import { Hono } from 'hono'
import {
  registerCourse,
  getBookings,
  createBooking,
  getBookingById,
  updateBooking,
  deleteBooking,
  getUserBookings,
  confirmBooking,
  cancelBooking
} from '../controllers/bookingController'
import { authMiddleware, requireRole } from '../middleware/authMiddleware'

const bookingRoutes = new Hono()

// Public routes (no authentication required for course registration)
bookingRoutes.post('/register-course', registerCourse)

// Protected routes (authentication required)
bookingRoutes.use('*', authMiddleware)

// Admin routes
bookingRoutes.get('/bookings', requireRole(['admin']), getBookings)
bookingRoutes.post('/bookings', createBooking)
bookingRoutes.get('/bookings/:id', getBookingById)
bookingRoutes.put('/bookings/:id', updateBooking)
bookingRoutes.delete('/bookings/:id', deleteBooking)
bookingRoutes.get('/user/:userId', getUserBookings)
bookingRoutes.post('/:id/confirm', requireRole(['admin']), confirmBooking)
bookingRoutes.post('/:id/cancel', cancelBooking)

export default bookingRoutes