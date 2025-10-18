/**
 * Type Definitions for Recommendation Service
 */

import { z } from 'zod'

// Assessment Question Structure
export interface AssessmentQuestion {
  question: string
  answer: string | number | string[]
}

// Assessment Data Structure (matches database schema)
export interface AssessmentData {
  questions: Record<string, AssessmentQuestion>
  metadata: {
    submitted_at: string
    version: string
  }
}

// AI Analysis Recommendations
export interface AIRecommendations {
  instruments: string[]
  skill_level: 'beginner' | 'intermediate' | 'advanced'
  class_format: 'private' | 'group' | 'online'
  learning_path: string
}

// AI Analysis Structure
export interface AIAnalysis {
  recommendations: AIRecommendations
  analysis: {
    instrument_reasoning: string
    skill_level_reasoning: string
    strengths: string[]
    areas_for_improvement: string[]
    potential_challenges: string[]
    success_factors: string[]
  }
  practical_advice: {
    practice_routine: string
    equipment: string[]
    next_steps: string[]
  }
  ai_metadata: {
    model: string
    prompt_version: string
    confidence_score: number
    processing_time_ms: number
  }
}

// Database Row Types
export interface TestAssessmentRow {
  id: string
  session_id: string
  assessment_data: AssessmentData
  status: 'submitted' | 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

export interface ResultTestRow {
  id: string
  assessment_id: string
  session_id: string
  ai_analysis: AIAnalysis
  status: 'pending' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

// API Request/Response Types
export interface SubmitAssessmentRequest {
  session_id: string
  assessment_data: AssessmentData
}

export interface SubmitAssessmentResponse {
  success: boolean
  assessment_id: string
  status: string
  message: string
}

export interface GetResultsResponse {
  success: boolean
  data?: {
    assessment: TestAssessmentRow
    result?: ResultTestRow
  }
  message: string
}

// Validation Schemas
export const submitAssessmentSchema = z.object({
  session_id: z.string().min(1, 'Session ID is required'),
  assessment_data: z.object({
    questions: z.record(z.object({
      question: z.string(),
      answer: z.union([z.string(), z.number(), z.array(z.string())])
    })),
    metadata: z.object({
      submitted_at: z.string(),
      version: z.string()
    })
  })
})

// API Response Type
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  message?: string
}