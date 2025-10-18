# Error Handling & Retry Mechanisms

## 1. Error Categories

### 1.1 Validation Errors (4xx)

**Input Validation Error**
```typescript
{
  error: 'VALIDATION_ERROR',
  status: 400,
  message: 'Invalid input data',
  details: {
    age: 'Age must be between 4 and 80',
    practice_hours_per_week: 'Must be between 0 and 20'
  }
}
```

**Authentication Error**
```typescript
{
  error: 'UNAUTHORIZED',
  status: 401,
  message: 'Invalid or missing session'
}
```

**Authorization Error**
```typescript
{
  error: 'FORBIDDEN',
  status: 403,
  message: 'User not authorized to access this resource'
}
```

**Resource Not Found**
```typescript
{
  error: 'NOT_FOUND',
  status: 404,
  message: 'Assessment not found'
}
```

### 1.2 Server Errors (5xx)

**Database Error**
```typescript
{
  error: 'DATABASE_ERROR',
  status: 500,
  message: 'Failed to save assessment',
  retryable: true
}
```

**AI Service Error**
```typescript
{
  error: 'AI_SERVICE_ERROR',
  status: 503,
  message: 'AI service temporarily unavailable',
  retryable: true
}
```

**Message Broker Error**
```typescript
{
  error: 'MESSAGE_BROKER_ERROR',
  status: 503,
  message: 'Failed to publish/consume event',
  retryable: true
}
```

**Event Processing Error**
```typescript
{
  error: 'EVENT_PROCESSING_ERROR',
  status: 500,
  message: 'Failed to process assessment event',
  retryable: true
}
```

**Internal Server Error**
```typescript
{
  error: 'INTERNAL_ERROR',
  status: 500,
  message: 'An unexpected error occurred',
  retryable: false
}
```

## 2. Retry Strategy

### 2.1 Exponential Backoff

```typescript
function calculateBackoffDelay(attempt: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 60000; // 60 seconds
  const jitter = Math.random() * 1000; // 0-1 second jitter
  
  const delay = Math.min(
    baseDelay * Math.pow(2, attempt - 1) + jitter,
    maxDelay
  );
  
  return delay;
}

// Attempt 1: ~1s
// Attempt 2: ~2s
// Attempt 3: ~4s
// Attempt 4: ~8s
// Attempt 5: ~16s (capped at 60s)
```

### 2.2 Retry Configuration

```typescript
const RETRY_CONFIG = {
  // Orchestrator: Event Publishing
  eventPublishing: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  },
  
  // AI-Worker: AI Service Calls
  aiService: {
    maxRetries: 3,
    initialDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 2
  },
  
  // Database operations
  database: {
    maxRetries: 3,
    initialDelay: 500,
    maxDelay: 10000,
    backoffMultiplier: 2
  },
  
  // Message broker operations
  messageBroker: {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  }
```
};
```

### 2.3 Retry Implementation

```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  operationName: string
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      logger.debug(`Attempting ${operationName}`, { attempt });
      return await operation();
      
    } catch (error) {
      lastError = error;
      
      if (attempt === config.maxRetries) {
        logger.error(`${operationName} failed after ${attempt} attempts`, {
          error,
          attempt
        });
        break;
      }
      
      const delay = calculateBackoffDelay(attempt);
      logger.warn(`${operationName} attempt ${attempt} failed, retrying in ${delay}ms`, {
        error: error.message,
        attempt,
        delay
      });
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}
```

## 3. Dead Letter Queue (DLQ)

### 3.1 DLQ Purpose
- Store messages that failed after all retries
- Enable manual inspection and recovery
- Prevent message loss

### 3.2 DLQ Implementation

```typescript
async function moveToDeadLetterQueue(
  message: any,
  error: Error,
  worker: string
): Promise<void> {
  const dlqEntry = {
    original_message: message,
    error: error.message,
    error_stack: error.stack,
    worker,
    timestamp: new Date().toISOString(),
    attempts: message.attempts || 0
  };
  
  // Store in Redis
  await redis.lpush(
    'dlq:failed_assessments',
    JSON.stringify(dlqEntry)
  );
  
  // Also store in database for persistence
  await db.failedAssessments.create(dlqEntry);
  
  logger.error('Message moved to DLQ', { dlqEntry });
}
```

### 3.3 DLQ Recovery

```typescript
async function recoverFromDLQ(dlqEntryId: string): Promise<void> {
  // 1. Fetch from DLQ
  const dlqEntry = await db.failedAssessments.findById(dlqEntryId);
  
  // 2. Analyze error
  logger.info('Analyzing DLQ entry', { dlqEntry });
  
  // 3. Determine recovery action
  if (dlqEntry.error.includes('database')) {
    // Retry database operation
    await redis.lpush('answers_received', JSON.stringify(dlqEntry.original_message));
  } else if (dlqEntry.error.includes('AI service')) {
    // Retry AI processing
    await redis.lpush('answers_saved', JSON.stringify(dlqEntry.original_message));
  }
  
  // 4. Mark as recovered
  await db.failedAssessments.update(dlqEntryId, { status: 'recovered' });
}
```

## 4. Specific Error Scenarios

### 4.1 Database Connection Error

```typescript
// Error: Connection timeout
// Retryable: Yes
// Action: Exponential backoff, then DLQ

async function handleDatabaseError(error: Error): Promise<void> {
  if (error.message.includes('ECONNREFUSED')) {
    logger.error('Database connection refused', { error });
    // Retry with backoff
    throw new RetryableError('Database connection failed', error);
  }
}
```

### 4.2 AI Service Rate Limit

```typescript
// Error: 429 Too Many Requests
// Retryable: Yes
// Action: Respect Retry-After header

async function handleAIRateLimit(response: any): Promise<void> {
  const retryAfter = response.headers['retry-after'];
  const delay = parseInt(retryAfter) * 1000 || 60000;
  
  logger.warn('AI service rate limited', { retryAfter, delay });
  
  await sleep(delay);
  throw new RetryableError('Rate limited, will retry');
}
```

### 4.3 AI Service Timeout

```typescript
// Error: Request timeout
// Retryable: Yes
// Action: Exponential backoff

async function handleAITimeout(error: Error): Promise<void> {
  if (error.code === 'ECONNABORTED') {
    logger.warn('AI service timeout', { error });
    throw new RetryableError('AI service timeout', error);
  }
}
```

### 4.4 Invalid AI Response

```typescript
// Error: Response doesn't match schema
// Retryable: No (likely a prompt issue)
// Action: Log and use fallback

async function handleInvalidAIResponse(response: any): Promise<void> {
  logger.error('Invalid AI response format', { response });
  
  // Use fallback recommendations
  return generateFallbackRecommendations(assessment);
}
```

## 5. Monitoring & Alerting

### 5.1 Error Metrics

```typescript
const errorMetrics = {
  validation_errors: 0,
  database_errors: 0,
  ai_service_errors: 0,
  timeout_errors: 0,
  dlq_entries: 0
};

// Track errors
function trackError(errorType: string): void {
  errorMetrics[errorType]++;
  
  // Alert if threshold exceeded
  if (errorMetrics[errorType] > 10) {
    sendAlert(`High ${errorType} rate detected`);
  }
}
```

### 5.2 Error Logging

```typescript
logger.error('Assessment processing failed', {
  assessment_id,
  session_id,
  error: error.message,
  error_code: error.code,
  worker: 'ai_processing',
  attempt: 3,
  timestamp: new Date().toISOString(),
  context: {
    ai_model: 'gpt-4',
    prompt_length: 2000
  }
});
```

## 6. Graceful Degradation

### 6.1 Fallback Recommendations

```typescript
function generateFallbackRecommendations(assessment: Assessment): RecommendationResult {
  // Use rule-based engine when AI is unavailable
  
  return {
    recommendations: {
      instruments: [selectInstrumentByRules(assessment)],
      skill_level: assessSkillLevelByRules(assessment),
      class_format: selectClassFormatByRules(assessment),
      learning_path: 'We recommend starting with...'
    },
    analysis: {
      instrument_reasoning: 'Based on your experience and preferences...',
      skill_level_reasoning: 'Your experience level suggests...',
      strengths: ['Good practice discipline'],
      areas_for_improvement: ['Technical foundation'],
      learning_style_match: 'Structured learning approach recommended',
      potential_challenges: ['Time management'],
      success_factors: ['Consistent practice']
    },
    practical_advice: {
      practice_routine: '30 minutes daily',
      equipment: 'Basic instrument and metronome',
      genre_focus: 'Start with simple songs',
      next_steps: 'Book a trial class'
    },
    ai_metadata: {
      model: 'fallback-rules',
      prompt_version: '1.0',
      confidence_score: 0.5,
      processing_time_ms: 100
    },
    note: 'These recommendations were generated using our standard rules. ' +
          'For more personalized recommendations, please try again later.'
  };
}
```

### 6.2 Partial Results

```typescript
// If AI service fails but data is saved
async function handlePartialCompletion(assessment_id: string): Promise<void> {
  const assessment = await db.testAssessment.findById(assessment_id);
  
  // Return what we have
  return {
    status: 'partial',
    message: 'Assessment saved but recommendations pending',
    assessment_id,
    can_retry: true
  };
}
```

## 7. Error Recovery Procedures

### 7.1 Manual Recovery

```bash
# Check DLQ
GET /admin/dlq/status

# Retry specific entry
POST /admin/dlq/retry/:dlq_entry_id

# Clear DLQ
DELETE /admin/dlq/clear
```

### 7.2 Automated Recovery

```typescript
// Run every 5 minutes
async function automaticDLQRecovery(): Promise<void> {
  const dlqEntries = await db.failedAssessments.findOldest(5);
  
  for (const entry of dlqEntries) {
    try {
      await recoverFromDLQ(entry.id);
    } catch (error) {
      logger.error('DLQ recovery failed', { entry, error });
    }
  }
}
```

