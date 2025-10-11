/**
 * Service-to-Service Communication Utility
 * Handles HTTP calls between microservices with proper error handling
 */

interface ServiceCallOptions extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
}

interface ServiceResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}

const DEFAULT_TIMEOUT = 10000 // 10 seconds
const DEFAULT_RETRIES = 2
const DEFAULT_RETRY_DELAY = 1000 // 1 second

/**
 * Make HTTP call to another microservice with timeout and retry logic
 */
export const callService = async <T = any>(
  url: string,
  options: ServiceCallOptions = {}
): Promise<ServiceResponse<T>> => {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    ...fetchOptions
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Add service identification header
      const headers = {
        ...fetchOptions.headers,
        'X-Service-Name': process.env.SERVICE_NAME || 'unknown',
        'X-Service-Token': process.env.SERVICE_JWT_SECRET || '',
      }

      // Fetch with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Parse response
      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.error?.code || 'SERVICE_ERROR',
            message: data.error?.message || `Service returned ${response.status}`,
            details: data.error?.details,
          },
        }
      }

      return {
        success: true,
        data: data.data || data,
      }
    } catch (error) {
      lastError = error as Error

      // Don't retry on abort (timeout) errors
      if (lastError.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'SERVICE_TIMEOUT',
            message: `Service call timeout after ${timeout}ms: ${url}`,
          },
        }
      }

      // Retry on network errors
      if (attempt < retries) {
        console.warn(`Service call failed (attempt ${attempt + 1}/${retries + 1}): ${url}`)
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
        continue
      }
    }
  }

  // All retries failed
  return {
    success: false,
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: `Service unavailable after ${retries + 1} attempts: ${url}`,
      details: lastError?.message,
    },
  }
}

/**
 * Check if a service is healthy
 */
export const checkServiceHealth = async (serviceUrl: string): Promise<boolean> => {
  try {
    const response = await callService(`${serviceUrl}/health`, {
      method: 'GET',
      timeout: 5000,
      retries: 1,
    })
    return response.success
  } catch {
    return false
  }
}

/**
 * Circuit breaker pattern for service calls
 * Prevents cascading failures by stopping calls to failing services
 */
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime: number | null = null
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 60 seconds
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.lastFailureTime && Date.now() - this.lastFailureTime >= this.timeout) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN - service is unavailable')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }

  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.threshold) {
      this.state = 'OPEN'
    }
  }

  getState() {
    return this.state
  }

  reset() {
    this.failures = 0
    this.lastFailureTime = null
    this.state = 'CLOSED'
  }
}
