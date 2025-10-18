/**
 * Assessment Routes
 * Define routes for assessment submission
 */

import { Hono } from 'hono'
import { submitAssessment } from '../controllers/assessmentController'
import { sessionAuthMiddleware } from '../middleware/sessionAuth'

const assessmentRoutes = new Hono()

// Submit assessment (requires valid session)
assessmentRoutes.post('/', sessionAuthMiddleware, submitAssessment)

export default assessmentRoutes