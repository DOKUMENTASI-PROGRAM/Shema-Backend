# Worker Implementation Strategy

## 1. Worker Architecture Overview

The recommendation system uses an **event-driven architecture** with an orchestrator and consumer pattern using message brokers (Kafka/RabbitMQ).

### Component Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ Orchestrator: Answer Receiver & Persistence (HTTP Handler)  │
├─────────────────────────────────────────────────────────────┤
│ • Receives POST /api/assessment/submit                      │
│ • Validates input against schema                            │
│ • Saves data to test_assessment table                       │
│ • Publishes "assessment_submitted" event to broker          │
│ • Returns assessment_id to client                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼ (Message Broker)
┌─────────────────────────────────────────────────────────────┐
│ AI-Worker: Event Consumer & AI Processor                    │
├─────────────────────────────────────────────────────────────┤
│ • Consumes "assessment_submitted" event                     │
│ • Builds AI prompt from event data                          │
│ • Calls external AI service                                 │
│ • Parses AI response                                        │
│ • Saves results to result_test table                        │
│ • Publishes "recommendation_completed" event                │
└─────────────────────────────────────────────────────────────┘
```

## 2. Orchestrator: Answer Receiver & Persistence Implementation

### Responsibilities
- HTTP endpoint handler
- Input validation
- Database persistence
- Event publishing to message broker
- Queue publishing

### Pseudocode

```typescript
async function handleSubmitAssessment(req: Request): Promise<Response> {
  // 1. Validate session from Redis
  const sessionData = await validateSession(req.cookies.sid);
  
  // 2. Validate request body against schema
  const validatedData = validateAssessmentInput(req.body);
  
  // 3. Create assessment record
  const assessment = await db.testAssessment.create({
    session_id: sessionData.sid,
    ...validatedData,
    status: 'submitted'
  });
  
  // 4. Publish event to message broker
  await messageBroker.publish('assessment_submitted', {
    assessment_id: assessment.id,
    session_id: sessionData.sid,
    answers: validatedData,
    timestamp: Date.now()
  });
  
  // 5. Return response
  return {
    status: 202,
    body: {
      success: true,
      data: {
        assessment_id: assessment.id,
        status: 'submitted'
      }
    }
  };
}
```

## 3. AI-Worker: Event Consumer & AI Processing Implementation

### Responsibilities
- Event consumption from message broker
- AI prompt building
- External AI service calls
- Result persistence
- Completion event publishing

### Pseudocode

```typescript
async function persistenceWorker() {
  while (true) {
    try {
      // 1. Pop message from queue (blocking)
      const message = await redis.brpop('answers_received', 0);
      
      if (!message) continue;
      
      ### Pseudocode

```typescript
async function aiWorker() {
  // Subscribe to assessment_submitted events
  await messageBroker.subscribe('assessment_submitted', async (event) => {
    try {
      const { assessment_id, session_id, answers } = event.data;
      
      // 1. Build AI prompt from event data
      const prompt = buildAssessmentPrompt(answers);
      
      // 2. Call AI service
      const aiResponse = await callAIService(prompt);
      
      // 3. Parse response
      const recommendations = parseAIResponse(aiResponse);
      
      // 4. Save results to database
      await db.resultTest.create({
        assessment_id: assessment_id,
        session_id: session_id,
        ...recommendations,
        status: 'completed'
      });
      
      // 5. Update assessment status
      await db.testAssessment.update(assessment_id, {
        status: 'completed'
      });
      
      // 6. Publish completion event (optional)
      await messageBroker.publish('recommendation_completed', {
        assessment_id: assessment_id,
        session_id: session_id,
        timestamp: Date.now()
      });
      
    } catch (error) {
      await handleWorkerError(error, event, 'ai_worker');
    }
  });
}
```

## 4. Orchestrator Lifecycle Management

### Startup
```typescript
async function startOrchestrator() {
  // Start HTTP server
  const server = express();
  
  // Register routes
  server.post('/api/assessment/submit', handleSubmitAssessment);
  
  // Start message broker connection
  await messageBroker.connect();
  
  server.listen(3005);
}
```

### AI-Worker Startup
```typescript
async function startAIWorker() {
  // Connect to message broker
  await messageBroker.connect();
  
  // Start event consumer
  await aiWorker();
}
```
}
```

## 4. Worker 3: AI Processing Implementation

### Responsibilities
- Queue message consumption
- Prompt building from assessment data
- AI service API calls
- Result parsing and storage
- Error handling

### Pseudocode

```typescript
async function aiProcessingWorker() {
  while (true) {
    try {
      // 1. Pop message from queue
      const message = await redis.brpop('answers_saved', 0);
      
      if (!message) continue;
      
      const data = JSON.parse(message);
      
      // 2. Fetch assessment data
      const assessment = await db.testAssessment.findById(
        data.assessment_id
      );
      
      // 3. Build AI prompt
      const prompt = buildAssessmentPrompt(assessment);
      
      // 4. Call AI service
      const aiResponse = await callAIService(prompt);
      
      // 5. Parse response
      const recommendations = parseAIResponse(aiResponse);
      
      // 6. Save results
      await db.resultTest.create({
        assessment_id: data.assessment_id,
        session_id: data.session_id,
        ...recommendations,
        status: 'completed'
      });
      
      // 7. Update assessment status
      await db.testAssessment.update(data.assessment_id, {
        status: 'completed'
      });
      
      // 8. Publish completion event
      await redis.publish('assessment_completed', JSON.stringify({
        assessment_id: data.assessment_id,
        session_id: data.session_id,
        timestamp: Date.now()
      }));
      
    } catch (error) {
      await handleWorkerError(error, message, 'ai_processing_worker');
    }
  }
}
```

## 5. Worker Lifecycle Management

### Startup
```typescript
async function startWorkers() {
  // Start all workers concurrently
  await Promise.all([
    startWorker1(),
    startWorker2(),
    startWorker3()
  ]);
}
```

### Graceful Shutdown
```typescript
async function gracefulShutdown() {
  // 1. Stop accepting new requests
  server.close();
  
  // 2. Wait for in-flight messages to complete
  await Promise.all([
    worker2.waitForCompletion(),
    worker3.waitForCompletion()
  ]);
  
  // 3. Close connections
  await redis.quit();
  await db.close();
}
```

## 6. Concurrency Control

### Queue Configuration
```typescript
const QUEUE_CONFIG = {
  answers_received: {
    maxConcurrency: 10,
    timeout: 30000
  },
  answers_saved: {
    maxConcurrency: 5,
    timeout: 60000
  }
};
```

### Worker Scaling
- **Worker 1**: Scales with HTTP requests (auto-scaled by Bun)
- **Worker 2**: 5-10 concurrent consumers
- **Worker 3**: 3-5 concurrent consumers (limited by AI service rate limits)

## 7. Monitoring & Observability

### Metrics to Track
- Queue depth (messages waiting)
- Processing time per worker
- Error rates and types
- AI service response times
- Database operation times

### Logging
```typescript
logger.info('Worker started', { worker: 'persistence', pid: process.pid });
logger.debug('Processing message', { assessment_id, timestamp });
logger.error('Worker error', { worker, error, message });
```

