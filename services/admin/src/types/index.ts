/**
 * Shared Types for Auth Service
 */

export type UserRole = 'admin' | 'instructor' | 'student'
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels'
export type EnrollmentStatus = 'pending' | 'active' | 'completed' | 'cancelled'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone_number?: string
  avatar_url?: string
  created_at: string
  updated_at: string
  last_login_at?: string
}

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  iat?: number
  exp?: number
}

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    requestId?: string
  }
}

export interface RegisterRequest {
  email: string
  password: string
  full_name: string
  role: 'admin' // Only admin registration allowed
  phone_number?: string
  learning_goal?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}
