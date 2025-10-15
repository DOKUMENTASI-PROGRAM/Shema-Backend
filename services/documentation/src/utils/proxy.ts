/**
 * Service Proxy Utility
 * Handles forwarding requests to microservices with error handling and retry logic
 */

import { Context } from 'hono'
import { SERVICE_TIMEOUT, GATEWAY_CONFIG } from '../config/services'

export interface ProxyOptions {
  serviceUrl: string
  path: string
  method?: string
  body?: any
  headers?: Record<string, string>
  maxRetries?: number
  timeout?: number
}

export interface ServiceResponse {
  success: boolean
  data?: any
  error?: {
    code: string
    message: string
    details?: any
  }
  statusCode: number
}

/**
 * Forward request to a microservice with retry logic
 */
export async function proxyToService(
  c: Context,
  options: ProxyOptions
): Promise<Response> {
  const {
    serviceUrl,
    path,
    method = c.req.method,
    body,
    headers = {},
    maxRetries = GATEWAY_CONFIG.MAX_RETRIES,
    timeout = SERVICE_TIMEOUT,
  } = options

  const targetUrl = `${serviceUrl}${path}`
  
  // Merge headers - forward Authorization and other important headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  // Forward Authorization header if present
  const authHeader = c.req.header('Authorization')
  if (authHeader) {
    requestHeaders['Authorization'] = authHeader
  }

  // Add service-to-service identifier
  requestHeaders['X-Gateway-Request'] = 'true'
  requestHeaders['X-Forwarded-For'] = c.req.header('X-Forwarded-For') || 'unknown'
  requestHeaders['X-Forwarded-Host'] = c.req.header('host') || 'unknown'

  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
        signal: controller.signal,
      }

      // Add body for non-GET requests
      if (body && method !== 'GET' && method !== 'HEAD') {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
      } else if (method !== 'GET' && method !== 'HEAD') {
        // Try to get body from request
        try {
          const requestBody = await c.req.json()
          if (requestBody) {
            fetchOptions.body = JSON.stringify(requestBody)
          }
        } catch {
          // No body or invalid JSON, continue without body
        }
      }

      const response = await fetch(targetUrl, fetchOptions)
      clearTimeout(timeoutId)

      // Clone the response to preserve the body for error handling
      const clonedResponse = response.clone()

      // If response is not ok and we have retries left, retry
      if (!response.ok && attempt < maxRetries) {
        const errorData = await clonedResponse.json().catch(() => ({}))
        console.warn(
          `Service request failed (attempt ${attempt}/${maxRetries}): ${targetUrl}`,
          errorData
        )
        
        // Wait before retry with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100))
        continue
      }

      // Return the original response
      return response

    } catch (error: any) {
      lastError = error
      console.error(
        `Service request error (attempt ${attempt}/${maxRetries}): ${targetUrl}`,
        error.message
      )

      if (attempt < maxRetries) {
        // Wait before retry with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100))
        continue
      }
    }
  }

  // All retries failed
  const errorMessage = lastError?.message || 'Service unavailable'
  const errorCode = lastError?.name === 'AbortError' ? 'SERVICE_TIMEOUT' : 'SERVICE_UNAVAILABLE'

  return c.json(
    {
      success: false,
      error: {
        code: errorCode,
        message: `Failed to reach service after ${maxRetries} attempts: ${errorMessage}`,
        details: {
          service: serviceUrl,
          path,
          lastError: lastError?.message,
        },
      },
    },
    503
  )
}

/**
 * Fetch data from multiple services in parallel
 */
export async function fetchFromMultipleServices(
  requests: Array<{
    name: string
    serviceUrl: string
    path: string
    headers?: Record<string, string>
  }>
): Promise<Record<string, any>> {
  const results = await Promise.allSettled(
    requests.map(async (req) => {
      const response = await fetch(`${req.serviceUrl}${req.path}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Request': 'true',
          ...req.headers,
        },
      })

      if (!response.ok) {
        throw new Error(`${req.name} service error: ${response.statusText}`)
      }

      return {
        name: req.name,
        data: await response.json(),
      }
    })
  )

  const aggregatedData: Record<string, any> = {}

  results.forEach((result, index) => {
    const requestName = requests[index].name
    if (result.status === 'fulfilled') {
      aggregatedData[requestName] = result.value.data
    } else {
      console.error(`Failed to fetch from ${requestName}:`, result.reason)
      aggregatedData[requestName] = {
        error: result.reason.message,
        available: false,
      }
    }
  })

  return aggregatedData
}
