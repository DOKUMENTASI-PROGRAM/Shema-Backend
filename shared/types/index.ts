/**
 * Shared TypeScript Types for Shema Music Backend
 * Used across all microservices
 */

// User Roles (matches Supabase enum)
export type UserRole = 'admin' | 'instructor' | 'student'

// Course Level (matches Supabase enum)
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels'

// Enrollment Status (matches Supabase enum)
export type EnrollmentStatus = 'pending' | 'active' | 'completed' | 'cancelled'

// User Interface
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

// JWT Payload
export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  iat?: number
  exp?: number
}

// API Response Generic
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

// Error Codes
export enum ErrorCode {
  // Authentication Errors
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN = 'AUTH_FORBIDDEN',
  
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  VALIDATION_EMAIL_INVALID = 'VALIDATION_EMAIL_INVALID',
  VALIDATION_PASSWORD_WEAK = 'VALIDATION_PASSWORD_WEAK',
  
  // Database Errors
  DB_CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR = 'DB_QUERY_ERROR',
  DB_DUPLICATE_ENTRY = 'DB_DUPLICATE_ENTRY',
  
  // Booking Errors
  BOOKING_INVALID_SLOTS = 'BOOKING_INVALID_SLOTS',
  BOOKING_EXPIRED = 'BOOKING_EXPIRED',
  BOOKING_ALREADY_EXISTS = 'BOOKING_ALREADY_EXISTS',
  
  // Generic Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NOT_FOUND = 'NOT_FOUND',
}

// Registration Request
export interface RegisterRequest {
  email: string
  password: string
  full_name: string
  role?: UserRole
  phone_number?: string
  // Student-specific fields (optional)
  preferred_instruments?: string[]
  experience_level?: string
  learning_goal?: string
}

// Login Request
export interface LoginRequest {
  email: string
  password: string
}

// Auth Response
export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}
