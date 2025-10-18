# AI Integration & Prompt Engineering

## 1. AI Service Selection

### Recommended Options
1. **OpenAI GPT-4** (Recommended)
   - Best for complex reasoning
   - Excellent instruction following
   - Cost: ~$0.03-0.06 per 1K tokens

2. **Anthropic Claude 3**
   - Strong reasoning capabilities
   - Good for structured output
   - Cost: ~$0.003-0.03 per 1K tokens

3. **Google Gemini**
   - Good multimodal support
   - Competitive pricing
   - Cost: ~$0.0005-0.002 per 1K tokens

### Configuration
```typescript
const AI_CONFIG = {
  provider: 'openai', // or 'anthropic', 'google'
  model: 'gpt-4-turbo',
  apiKey: process.env.AI_API_KEY,
  timeout: 30000,
  maxRetries: 3,
  temperature: 0.7,
  maxTokens: 2000
};
```

## 2. Prompt Engineering Strategy

### System Prompt (Context)

```
You are an expert music education advisor for ShemaMusic, a music lesson platform.
Your role is to analyze student assessment responses and provide personalized 
recommendations for music class registration.

You must provide recommendations that are:
- Specific and actionable
- Based on the student's experience and goals
- Realistic given their constraints
- Encouraging and motivating

Output format: Provide structured JSON with all required fields.
```

### User Prompt Template

```
Based on the following student assessment, provide personalized music class 
recommendations:

STUDENT PROFILE:
- Age: {age}
- Experience: {total_experience_years} years
- Previous Instruments: {previous_instruments}
- Current Skill Level: {notation_reading_level}

GOALS & INTERESTS:
- Primary Goals: {goals}
- Preferred Genres: {preferred_genres}
- Learning Style: {learning_style}
- Ensemble Role Preference: {ensemble_role}

CONSTRAINTS & PREFERENCES:
- Practice Time Available: {practice_hours_per_week} hours/week
- Home Space: {home_space_availability}
- Noise Sensitivity: {noise_sensitivity}/5
- Budget: {initial_budget}
- Class Format Preference: {class_format_preference}

LEARNING CHARACTERISTICS:
- Performance Comfort: {performance_comfort}/5
- Practice Discipline: {practice_discipline}/5
- Improvisation Interest: {improvisation_interest}/5
- Grading Exam Interest: {grading_exam_interest}

ADDITIONAL CONTEXT:
- Physical Considerations: {physical_considerations}
- Available Equipment: {available_instruments}
- Notation Preference: {notation_preference}
- Additional Notes: {additional_notes}

Please provide:
1. Recommended instruments (primary and secondary)
2. Recommended skill level for starting
3. Recommended class format
4. Detailed reasoning for each recommendation
5. Personalized learning path
6. Practice routine suggestions
7. Potential challenges and how to overcome them
8. Success factors specific to this student
9. Next immediate steps

Format your response as valid JSON.
```

## 3. Response Parsing

### Expected AI Response Structure

```json
{
  "recommendations": {
    "instruments": ["Gitar Akustik", "Ukulele"],
    "skill_level": "intermediate",
    "class_format": "small_group",
    "learning_path": "Start with fingerstyle techniques..."
  },
  "analysis": {
    "instrument_reasoning": "Based on your experience and preferences...",
    "skill_level_reasoning": "Your 3 years of experience suggests...",
    "strengths": ["Good rhythm sense", "Consistent practice"],
    "areas_for_improvement": ["Music theory", "Sight reading"],
    "learning_style_match": "You prefer exploratory learning...",
    "potential_challenges": ["Time management", "Motivation"],
    "success_factors": ["Regular practice", "Group learning"]
  },
  "practical_advice": {
    "practice_routine": "30 minutes daily, 5 days a week",
    "equipment": "Invest in a quality capo and tuner",
    "genre_focus": "Focus on Pop and Jazz genres",
    "next_steps": "Book a trial class with our instructors"
  },
  "ai_metadata": {
    "model": "gpt-4",
    "prompt_version": "2.1",
    "confidence_score": 0.92,
    "processing_time_ms": 12500
  }
}
```

### Parsing Implementation

```typescript
async function parseAIResponse(rawResponse: string): Promise<RecommendationResult> {
  try {
    // 1. Extract JSON from response
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }
    
    // 2. Parse JSON
    const parsed = JSON.parse(jsonMatch[0]);
    
    // 3. Validate structure
    validateRecommendationSchema(parsed);
    
    // 4. Transform to database format
    return transformToDBFormat(parsed);
    
  } catch (error) {
    logger.error('Failed to parse AI response', { error, rawResponse });
    throw new Error('Invalid AI response format');
  }
}
```

## 4. API Integration

### OpenAI Integration Example

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function callAIService(prompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      timeout: 30000
    });
    
    return response.choices[0].message.content;
    
  } catch (error) {
    logger.error('AI service error', { error });
    throw new AIServiceError('Failed to get AI recommendations');
  }
}
```

## 5. Error Handling & Fallbacks

### Retry Strategy

```typescript
async function callAIServiceWithRetry(
  prompt: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callAIService(prompt);
    } catch (error) {
      lastError = error;
      const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
      logger.warn(`AI service attempt ${attempt} failed, retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}
```

### Fallback Recommendations

```typescript
function generateFallbackRecommendations(assessment: Assessment): RecommendationResult {
  // Generate basic recommendations based on rules engine
  // Used when AI service is unavailable
  
  const recommendations = {
    primary_instrument: selectInstrumentByRules(assessment),
    skill_level: assessSkillLevel(assessment),
    class_format: selectClassFormat(assessment),
    confidence_score: 0.5 // Lower confidence for fallback
  };
  
  return recommendations;
}
```

## 6. Cost Optimization

### Token Estimation
- Average prompt: ~800 tokens
- Average response: ~1200 tokens
- Total per assessment: ~2000 tokens
- Cost per assessment: ~$0.06 (GPT-4)

### Caching Strategy
```typescript
// Cache AI responses for identical assessments
const cacheKey = hashAssessmentData(assessment);
const cached = await redis.get(`ai_response:${cacheKey}`);

if (cached) {
  return JSON.parse(cached);
}

const response = await callAIService(prompt);
await redis.setex(`ai_response:${cacheKey}`, 86400, JSON.stringify(response));
```

## 7. Monitoring & Analytics

### Metrics to Track
- AI response time
- Token usage per request
- Error rates
- Confidence scores distribution
- User satisfaction with recommendations

### Logging

```typescript
logger.info('AI processing completed', {
  assessment_id,
  model: 'gpt-4',
  tokens_used: 2000,
  response_time: 2500,
  confidence_score: 0.92
});
```

## 8. Prompt Versioning

### Version Management
```typescript
const PROMPT_VERSIONS = {
  'v1': { system: SYSTEM_PROMPT_V1, user: USER_PROMPT_V1 },
  'v2': { system: SYSTEM_PROMPT_V2, user: USER_PROMPT_V2 }
};

// Store version used in result_test.ai_prompt_version
```

### A/B Testing
- Test different prompt versions
- Compare recommendation quality
- Iterate based on user feedback

