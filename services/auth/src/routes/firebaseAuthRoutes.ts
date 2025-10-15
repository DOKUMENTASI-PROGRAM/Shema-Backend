/**
 * Firebase Auth Routes
 * Routes for Firebase-based authentication (Admin only)
 */

import { Hono } from 'hono'
import { 
  firebaseLogin, 
  firebaseRegister,
  requestPasswordReset 
} from '../controllers/firebaseAuthController'

const firebaseAuthRoutes = new Hono()

/**
 * @route POST /api/auth/firebase/login
 * @desc Login admin with Firebase ID token
 * @access Public
 * 
 * Request body:
 * {
 *   "idToken": "firebase-id-token-from-frontend"
 * }
 */
firebaseAuthRoutes.post('/login', firebaseLogin)

/**
 * @route POST /api/auth/firebase/register
 * @desc Register new admin via Firebase
 * @access Public (but creates admin user)
 * 
 * Request body:
 * {
 *   "email": "admin@shemamusic.com",
 *   "password": "SecurePass123!",
 *   "full_name": "Admin Name",
 *   "phone_number": "081234567890"
 * }
 */
firebaseAuthRoutes.post('/register', firebaseRegister)

/**
 * @route POST /api/auth/firebase/reset-password
 * @desc Request password reset link
 * @access Public
 * 
 * Request body:
 * {
 *   "email": "admin@shemamusic.com"
 * }
 */
firebaseAuthRoutes.post('/reset-password', requestPasswordReset)

export default firebaseAuthRoutes
