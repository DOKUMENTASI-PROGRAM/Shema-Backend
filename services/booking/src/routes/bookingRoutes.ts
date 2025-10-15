/**
 * Booking Routes
 * Define all booking-related routes
 */

import { Hono } from 'hono'
import { registerCourse } from '../controllers/bookingController'

const bookingRoutes = new Hono()

// Public routes (no authentication required for course registration)
bookingRoutes.post('/register-course', registerCourse)

// TODO: Add protected routes for admin booking management
// bookingRoutes.get('/pending', requireRole(['admin']), getPendingBookings)
// bookingRoutes.post('/:id/confirm', requireRole(['admin']), confirmBooking)

export default bookingRoutes