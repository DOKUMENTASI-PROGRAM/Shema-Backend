/**
 * Result Routes
 * Define routes for retrieving assessment results
 */

import { Hono } from 'hono'
import { getResults } from '../controllers/resultController'
import { sessionAuthMiddleware } from '../middleware/sessionAuth'

const resultRoutes = new Hono()

// Get assessment results by session ID (requires valid session)
resultRoutes.get('/:sessionId', sessionAuthMiddleware, getResults)

export default resultRoutes