/**
 * Service-to-Service HTTP Client
 * Provides secure inter-service communication with JWT authentication
 */

import jwt from 'jsonwebtoken'

export interface ServiceCallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: any
  headers?: Record<string, string>
  timeout?: number
}

export interface ServiceCallResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  status: number
}

/**
 * Generate service-to-service JWT token
 */
export function generateServiceToken(serviceName: string): string {
  const secret = process.env.SERVICE_JWT_SECRET || 'service-to-service-secret-key'
  
  return jwt.sign(
    {
      service: serviceName,
      type: 'service-to-service',
      iat: Math.floor(Date.now() / 1000)
    },
    secret,
    { expiresIn: '5m' } // Short-lived tokens for security
  )
}

/**
 * Make HTTP call to another service
 */
export async function callService<T = any>(
  serviceUrl: string,
  path: string,
  options: ServiceCallOptions = {}
): Promise<ServiceCallResponse<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = 30000
  } = options

  const url = `${serviceUrl}${path}`
  
  // Get service name from environment or use default
  const serviceName = process.env.SERVICE_NAME || 'unknown-service'
  
  // Generate service token
  const serviceToken = generateServiceToken(serviceName)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceToken}`,
        'X-Service-Name': serviceName,
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    const responseData = await response.json().catch(() => ({}))

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: responseData.error?.code || 'SERVICE_CALL_FAILED',
          message: responseData.error?.message || `Service call failed with status ${response.status}`,
          details: responseData.error?.details
        },
        status: response.status
      }
    }

    return {
      success: true,
      data: responseData.data || responseData,
      status: response.status
    }

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: {
          code: 'SERVICE_TIMEOUT',
          message: `Service call to ${serviceUrl} timed out after ${timeout}ms`
        },
        status: 504
      }
    }

    return {
      success: false,
      error: {
        code: 'SERVICE_CALL_ERROR',
        message: error.message || 'Failed to call service',
        details: error
      },
      status: 500
    }
  }
}

/**
 * Verify service-to-service token (middleware helper)
 */
export function verifyServiceToken(token: string): { valid: boolean; service?: string; error?: string } {
  try {
    const secret = process.env.SERVICE_JWT_SECRET || 'service-to-service-secret-key'
    const decoded = jwt.verify(token, secret) as any

    if (decoded.type !== 'service-to-service') {
      return { valid: false, error: 'Invalid token type' }
    }

    return { valid: true, service: decoded.service }
  } catch (error: any) {
    return { valid: false, error: error.message }
  }
}
