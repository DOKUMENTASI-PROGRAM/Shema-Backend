/**
 * Result Controller
 * Handles retrieval of assessment results
 */

import type { Context } from 'hono'
import { supabase } from '../config/supabase'
import { type APIResponse, type GetResultsResponse } from '../types'

/**
 * GET /results/:sessionId
 * Retrieve assessment results by session ID
 */
export async function getResults(c: Context): Promise<Response> {
  try {
    const sessionId = c.req.param('sessionId')

    if (!sessionId) {
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Session ID is required'
        }
      }, 400)
    }

    console.log(`🔍 Looking for assessment with session_id: ${sessionId}`)

    // Get assessment data (get the most recent one)
    const { data: assessment, error: assessmentError } = await supabase
      .from('test_assessment')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    console.log('Assessment query result:', { data: assessment, error: assessmentError })

    if (assessmentError) {
      if (assessmentError.code === 'PGRST116') { // No rows found
        return c.json<APIResponse>({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Assessment not found for this session'
          }
        }, 404)
      }
      console.error('Database query error:', assessmentError)
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve assessment data'
        }
      }, 500)
    }

    // Get result data if exists (get the most recent one)
    console.log(`🔍 Looking for results with session_id: ${sessionId}`)
    const { data: result, error: resultError } = await supabase
      .from('result_test')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    console.log('Result query result:', { data: result, error: resultError })

    if (resultError && resultError.code !== 'PGRST116') {
      console.error('Database query error:', resultError)
      return c.json<APIResponse>({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve result data'
        }
      }, 500)
    }

    const response: GetResultsResponse = {
      success: true,
      data: {
        assessment,
        result: result || undefined
      },
      message: result ? 'Results retrieved successfully' : 'Assessment found, results still processing'
    }

    return c.json(response)

  } catch (error) {
    console.error('Result retrieval error:', error)
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, 500)
  }
}