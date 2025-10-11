/**
 * Request Timeout Middleware
 * Prevents hanging requests by enforcing timeout limits
 */

export interface TimeoutOptions {
  timeout?: number // milliseconds
  message?: string
}

const DEFAULT_TIMEOUT = 30000 // 30 seconds
const DEFAULT_MESSAGE = 'Request timeout exceeded'

/**
 * Middleware factory to handle request timeouts
 * Usage: app.use('*', requestTimeout({ timeout: 30000 }))
 */
export const requestTimeout = (options: TimeoutOptions = {}) => {
  const timeout = options.timeout || DEFAULT_TIMEOUT
  const message = options.message || DEFAULT_MESSAGE

  return async (c: any, next: any) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(message))
      }, timeout)
    })

    try {
      await Promise.race([next(), timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === message) {
        return c.json(
          {
            success: false,
            error: {
              code: 'REQUEST_TIMEOUT',
              message: message,
              timeout: timeout,
            },
          },
          408
        )
      }
      throw error
    }
  }
}

/**
 * Service-to-Service call with timeout
 * Use this for inter-service HTTP calls
 */
export const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout: number = 10000
): Promise<Response> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Service call timeout: ${url}`)
    }
    throw error
  }
}
