/**
 * Shared Types for Booking Service
 */

export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'expired' | 'cancelled'
export type ReferralSource = 'instagram' | 'facebook' | 'google' | 'tiktok' | 'friend' | 'website' | 'other'

export interface CourseRegistrationRequest {
  // Personal Information
  full_name: string
  wa_number: string
  email: string

  // Course Information
  course_id: string

  // Preferences
  experience_level: 'beginner' | 'intermediate' | 'advanced'
  time_preferences?: string
  preferred_days: string[]
  preferred_time_range: {
    start: string // HH:MM format
    end: string   // HH:MM format
  }
  start_date_target?: string // ISO date string

  // Guardian Information (for students)
  guardian?: {
    name: string
    wa_number: string
  }

  // Additional Details
  instrument_owned?: boolean
  notes?: string
  referral_source?: ReferralSource

  // Consent & Security
  consent: boolean
  captcha_token: string
  idempotency_key: string
}

export interface Booking {
  id: string
  user_id: string
  course_id: string
  first_choice_slot_id?: string
  second_choice_slot_id?: string
  confirmed_slot_id?: string
  status: BookingStatus
  experience_level: string
  preferred_days: string[]
  preferred_time_range: {
    start: string
    end: string
  }
  start_date_target?: string
  guardian_name?: string
  guardian_wa_number?: string
  instrument_owned?: boolean
  notes?: string
  referral_source?: ReferralSource
  created_at: string
  updated_at: string
  expires_at: string
  confirmed_at?: string
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