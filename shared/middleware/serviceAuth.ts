/**
 * Service Authentication Middleware
 * Validates service-to-service JWT tokens
 */

import type { Context, Next } from 'hono'
import { verifyServiceToken } from '../utils/serviceClient'

/**
 * Middleware to authenticate service-to-service calls
 * Checks for X-Service-Token header and validates it
 */
export async function serviceAuthMiddleware(c: Context, next: Next) {
  const serviceToken = c.req.header('X-Service-Token')
  const serviceName = c.req.header('X-Service-Name')

  if (!serviceToken) {
    return c.json({
      success: false,
      error: {
        code: 'SERVICE_AUTH_MISSING',
        message: 'Service authentication token is required'
      }
    }, 401)
  }

  const verification = verifyServiceToken(serviceToken)

  if (!verification.valid) {
    return c.json({
      success: false,
      error: {
        code: 'SERVICE_AUTH_INVALID',
        message: 'Invalid service authentication token',
        details: verification.error
      }
    }, 401)
  }

  // Add service info to context
  c.set('callingService', verification.service)
  c.set('isServiceCall', true)

  await next()
}

/**
 * Optional middleware - allows both user auth and service auth
 * Useful for endpoints that can be called by users OR services
 */
export async function optionalServiceAuth(c: Context, next: Next) {
  const serviceToken = c.req.header('X-Service-Token')

  if (serviceToken) {
    const verification = verifyServiceToken(serviceToken)
    if (verification.valid) {
      c.set('callingService', verification.service)
      c.set('isServiceCall', true)
    }
  }

  await next()
}
