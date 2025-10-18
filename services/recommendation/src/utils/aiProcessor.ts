/**
 * AI Processor Utility
 * Handles AI-powered assessment analysis and recommendation generation
 */

import { GoogleGenAI } from '@google/genai'
import { supabase } from '../config/supabase'
import { type AssessmentData, type AIAnalysis } from '../types'

// Initialize Google Gen AI client
let genAI: GoogleGenAI | null = null

if (process.env.NODE_ENV !== 'test') {
  genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY || '' })
}

/**
 * Process assessment with AI and save results
 */
export async function processAssessmentWithAI(assessmentId: string, sessionId: string): Promise<void> {
  try {
    console.log(`🤖 Starting AI processing for assessment ${assessmentId}`)

    // Get assessment data
    const { data: assessment, error } = await supabase
      .from('test_assessment')
      .select('assessment_data')
      .eq('id', assessmentId)
      .single()

    if (error || !assessment) {
      throw new Error(`Failed to retrieve assessment data: ${error?.message}`)
    }

    const assessmentData: AssessmentData = assessment.assessment_data

    // Generate AI analysis
    const aiAnalysis = await generateAIRecommendations(assessmentData)

    // Save results to database
    console.log(`💾 Saving AI results for assessment ${assessmentId}...`)
    const { error: insertError } = await supabase
      .from('result_test')
      .insert({
        assessment_id: assessmentId,
        session_id: sessionId,
        ai_analysis: aiAnalysis,
        status: 'completed'
      })

    if (insertError) {
      console.error(`❌ Failed to save AI results:`, insertError)
      throw new Error(`Failed to save AI results: ${insertError.message}`)
    }

    console.log(`✅ AI results saved successfully for assessment ${assessmentId}`)

    // Update assessment status
    await supabase
      .from('test_assessment')
      .update({ status: 'completed' })
      .eq('id', assessmentId)

    console.log(`✅ AI processing completed for assessment ${assessmentId}`)

  } catch (error) {
    console.error(`❌ AI processing failed for assessment ${assessmentId}:`, error)

    // Update assessment status to failed
    await supabase
      .from('test_assessment')
      .update({ status: 'failed' })
      .eq('id', assessmentId)

    throw error
  }
}

/**
 * Generate mock AI response for testing when API is unavailable
 */
function getMockAIResponse(assessmentData: any): AIAnalysis {
  // Extract some basic info from assessment data
  const questions = assessmentData.questions || {}
  const instruments = questions.q1?.answer || ['piano']
  const experience = questions.q2?.answer || '1'
  const ageGroup = questions.q3?.answer || 'adult'
  
  return {
    recommendations: {
      instruments: Array.isArray(instruments) ? instruments : [instruments],
      skill_level: parseInt(experience) === 0 ? 'beginner' : parseInt(experience) <= 2 ? 'intermediate' : 'advanced',
      class_format: ageGroup === 'child' ? 'private' : 'group',
      learning_path: `Personalized ${instruments[0]} learning journey for ${ageGroup} with ${experience} years experience`
    },
    analysis: {
      instrument_reasoning: `Based on your interest in ${instruments.join(' and ')}, these instruments are suitable for your ${ageGroup} profile.`,
      skill_level_reasoning: `With ${experience} years of experience, you are assessed as ${parseInt(experience) === 0 ? 'beginner' : parseInt(experience) <= 2 ? 'intermediate' : 'advanced'} level.`,
      strengths: ['Good interest in music', 'Clear preferences stated'],
      areas_for_improvement: ['Practice consistency', 'Technical foundation'],
      potential_challenges: ['Time management', 'Initial learning curve'],
      success_factors: ['Regular practice', 'Quality instruction', 'Motivation']
    },
    practical_advice: {
      practice_routine: 'Practice 30 minutes daily, 5 days a week',
      equipment: [`${instruments[0]} instrument`, 'Music stand', 'Metronome'],
      next_steps: ['Schedule first lesson', 'Purchase basic equipment', 'Set practice goals']
    },
    ai_metadata: {
      model: 'mock-gemini-pro',
      prompt_version: '1.0',
      confidence_score: 0.75,
      processing_time_ms: 100
    }
  }
}
async function generateAIRecommendations(assessmentData: AssessmentData): Promise<AIAnalysis> {
  const startTime = Date.now()

  // Format assessment data for AI prompt
  const questionsText = Object.entries(assessmentData.questions)
    .map(([key, q]) => `${key}: ${q.question}\nAnswer: ${q.answer}`)
    .join('\n\n')

  const prompt = `
You are an expert music instructor analyzing a student's assessment responses to provide personalized learning recommendations.

Assessment Data:
${questionsText}

Based on this assessment, provide a comprehensive analysis and recommendations in the following JSON format:

{
  "recommendations": {
    "instruments": ["primary_instrument", "secondary_instrument"],
    "skill_level": "beginner|intermediate|advanced",
    "class_format": "private|group|online",
    "learning_path": "brief description of recommended path"
  },
  "analysis": {
    "instrument_reasoning": "detailed explanation of instrument recommendations",
    "skill_level_reasoning": "explanation of skill level assessment",
    "strengths": ["strength1", "strength2"],
    "areas_for_improvement": ["area1", "area2"],
    "potential_challenges": ["challenge1", "challenge2"],
    "success_factors": ["factor1", "factor2"]
  },
  "practical_advice": {
    "practice_routine": "recommended daily/weekly practice schedule",
    "equipment": ["essential_item1", "essential_item2"],
    "next_steps": ["step1", "step2", "step3"]
  }
}

Provide specific, actionable recommendations based on their responses. Be encouraging and realistic.
`

  try {
    if (!genAI) {
      throw new Error('Google AI client not initialized (test environment)')
    }

    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      }
    })

    if (!response.text) {
      throw new Error('No response from Google AI')
    }

    console.log('Raw AI response:', response.text) // Debug log

    // Try to extract JSON from the response
    let jsonText = response.text.trim()
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    // Parse JSON response
    const analysisData = JSON.parse(jsonText)

    // Validate that we have the required structure
    if (!analysisData || typeof analysisData !== 'object' || 
        !analysisData.recommendations || !analysisData.analysis || !analysisData.practical_advice) {
      console.error('Invalid AI response structure - missing required fields:', {
        hasRecommendations: !!analysisData?.recommendations,
        hasAnalysis: !!analysisData?.analysis,
        hasPracticalAdvice: !!analysisData?.practical_advice,
        response: analysisData
      })
      throw new Error('AI response does not contain all required fields (recommendations, analysis, practical_advice)')
    }

    // Add AI metadata
    const aiAnalysis: AIAnalysis = {
      ...analysisData,
      ai_metadata: {
        model: 'gemini-2.0-flash',
        prompt_version: '1.0',
        confidence_score: 0.85, // Could be calculated based on response quality
        processing_time_ms: Date.now() - startTime
      }
    }

    return aiAnalysis

  } catch (error) {
    console.error('Google AI API error:', error)
    
    // For testing purposes, return mock data if API fails
    console.log('⚠️  Google AI API failed, returning mock data for testing')
    return getMockAIResponse(assessmentData)
  }
}