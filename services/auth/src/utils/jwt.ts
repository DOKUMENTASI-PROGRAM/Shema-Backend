/**
 * JWT Utilities
 * Handle JWT token generation and verification
 */

import jwt from 'jsonwebtoken'
import type { JWTPayload, UserRole } from '../../../shared/types'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

/**
 * Generate Access Token (short-lived, 15 minutes)
 */
export function generateAccessToken(payload: {
  userId: string
  email: string
  role: UserRole
}): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'shema-music-auth',
    audience: 'shema-music-api'
  })
}

/**
 * Generate Refresh Token (long-lived, 7 days)
 */
export function generateRefreshToken(payload: {
  userId: string
  email: string
}): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'shema-music-auth',
    audience: 'shema-music-api'
  })
}

/**
 * Verify Access Token
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'shema-music-auth',
      audience: 'shema-music-api'
    }) as JWTPayload
    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('AUTH_TOKEN_EXPIRED')
    }
    throw new Error('AUTH_INVALID_TOKEN')
  }
}

/**
 * Verify Refresh Token
 */
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'shema-music-auth',
      audience: 'shema-music-api'
    }) as JWTPayload
    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('AUTH_TOKEN_EXPIRED')
    }
    throw new Error('AUTH_INVALID_TOKEN')
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload
  } catch {
    return null
  }
}
