/**
 * Assessment Controller
 * Handles assessment submission and processing
 */

import type { Context } from 'hono'
import { supabase } from '../config/supabase'
import { submitAssessmentSchema, type SubmitAssessmentRequest, type APIResponse, type SubmitAssessmentResponse } from '../types'
import { processAssessmentWithAI } from '../utils/aiProcessor'

/**
 * POST /assessment
 * Submit user assessment data
 */
export async function submitAssessment(c: Context): Promise<Response> {
  try {
    // Parse and validate request body
    const body: SubmitAssessmentRequest = await c.req.json()
    const validatedData = submitAssessmentSchema.parse(body)

    const { session_id, assessment_data } = validatedData

    // Insert assessment into database
    const { data: assessment, error: insertError } = await supabase
      .from('test_assessment')
      .insert({
        session_id,
        assessment_data,
        status: 'submitted'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to save assessment data'
        }
      }, 500)
    }

    // Start AI processing asynchronously
    processAssessmentWithAI(assessment.id, session_id).catch(error => {
      console.error('AI processing failed:', error)
      // Update status to failed
      supabase
        .from('test_assessment')
        .update({ status: 'failed' })
        .eq('id', assessment.id)
    })

    // Update status to processing
    await supabase
      .from('test_assessment')
      .update({ status: 'processing' })
      .eq('id', assessment.id)

    const response: SubmitAssessmentResponse = {
      success: true,
      assessment_id: assessment.id,
      status: 'processing',
      message: 'Assessment submitted successfully. AI analysis in progress.'
    }

    return c.json(response, 201)

  } catch (error) {
    console.error('Assessment submission error:', error)

    if (error instanceof Error && 'issues' in error) {
      // Zod validation error
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues
        }
      }, 400)
    }

    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500)
  }
}