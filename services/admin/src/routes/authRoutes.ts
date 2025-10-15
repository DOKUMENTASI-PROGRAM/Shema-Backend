/**
 * Auth Routes
 * Define all authentication-related routes
 */

import { Hono } from 'hono'
import { register, login, refreshToken, logout, getMe } from '../controllers/authController'
import { authMiddleware } from '../middleware/authMiddleware'

const authRoutes = new Hono()

// Public routes (no authentication required)
authRoutes.post('/register', register) // Admin registration only
authRoutes.post('/login', login) // Admin login only
authRoutes.post('/refresh', refreshToken)
authRoutes.post('/logout', logout)

// Protected routes (authentication required)
authRoutes.get('/me', authMiddleware, getMe)

export default authRoutes
