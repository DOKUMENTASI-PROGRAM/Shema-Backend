# Testing Strategy

## 1. Testing Pyramid

```
        ▲
       /|\
      / | \
     /  |  \  E2E Tests (10%)
    /   |   \ - Full workflow
   /    |    \- User scenarios
  /─────┼─────\
 /      |      \
/       |       \ Integration Tests (30%)
/        |        \- API endpoints
/         |         \- Database operations
/──────────┼──────────\- Queue operations
/          |          \
/           |           \ Unit Tests (60%)
/            |            \- Functions
/             |             \- Utilities
/              |              \- Validators
/───────────────┼───────────────\
```

## 2. Unit Tests

### 2.1 Validation Schema Tests

```typescript
// tests/unit/validation.test.ts
describe('Assessment Validation', () => {
  describe('Age validation', () => {
    it('should accept valid age', () => {
      const result = assessmentSchema.parse({ age: 25 });
      expect(result.age).toBe(25);
    });
    
    it('should reject age < 4', () => {
      expect(() => assessmentSchema.parse({ age: 3 })).toThrow();
    });
    
    it('should reject age > 80', () => {
      expect(() => assessmentSchema.parse({ age: 81 })).toThrow();
    });
  });
  
  describe('Practice hours validation', () => {
    it('should accept valid hours', () => {
      const result = assessmentSchema.parse({ practice_hours_per_week: 5 });
      expect(result.practice_hours_per_week).toBe(5);
    });
    
    it('should reject negative hours', () => {
      expect(() => assessmentSchema.parse({ practice_hours_per_week: -1 })).toThrow();
    });
  });
});
```

### 2.2 Worker Logic Tests

```typescript
// tests/unit/workers.test.ts
describe('Worker 1: Answer Receiver', () => {
  it('should create assessment record', async () => {
    const mockData = { age: 25, practice_hours_per_week: 5 };
    const result = await handleSubmitAssessment(mockData);
    
    expect(result.assessment_id).toBeDefined();
    expect(result.status).toBe('submitted');
  });
  
  it('should publish to Redis queue', async () => {
    const mockData = { age: 25 };
    await handleSubmitAssessment(mockData);
    
    const queueLength = await redis.llen('answers_received');
    expect(queueLength).toBeGreaterThan(0);
  });
});

describe('Worker 2: Data Persistence', () => {
  it('should save data to database', async () => {
    const message = { assessment_id: 'test-id', answers: {} };
    await persistenceWorker.processMessage(message);
    
    const saved = await db.testAssessment.findById('test-id');
    expect(saved).toBeDefined();
  });
});

describe('Worker 3: AI Processing', () => {
  it('should call AI service', async () => {
    const mockAssessment = { /* ... */ };
    const spy = jest.spyOn(aiService, 'call');
    
    await aiProcessingWorker.processMessage(mockAssessment);
    
    expect(spy).toHaveBeenCalled();
  });
});
```

### 2.3 Utility Function Tests

```typescript
// tests/unit/utils.test.ts
describe('Prompt Building', () => {
  it('should build valid prompt', () => {
    const assessment = { /* ... */ };
    const prompt = buildAssessmentPrompt(assessment);
    
    expect(prompt).toContain('STUDENT PROFILE');
    expect(prompt).toContain('GOALS & INTERESTS');
  });
});

describe('Response Parsing', () => {
  it('should parse valid AI response', () => {
    const response = JSON.stringify({
      recommendations: { primary_instrument: 'Guitar' }
    });
    
    const parsed = parseAIResponse(response);
    expect(parsed.recommendations.primary_instrument).toBe('Guitar');
  });
  
  it('should throw on invalid response', () => {
    expect(() => parseAIResponse('invalid json')).toThrow();
  });
});
```

## 3. Integration Tests

### 3.1 API Endpoint Tests

```typescript
// tests/integration/api.test.ts
describe('POST /api/assessment/submit', () => {
  it('should submit assessment successfully', async () => {
    const response = await request(app)
      .post('/api/assessment/submit')
      .set('Cookie', `sid=${validSessionId}`)
      .send(validAssessmentData);
    
    expect(response.status).toBe(202);
    expect(response.body.data.assessment_id).toBeDefined();
  });
  
  it('should reject invalid data', async () => {
    const response = await request(app)
      .post('/api/assessment/submit')
      .set('Cookie', `sid=${validSessionId}`)
      .send({ age: 200 }); // Invalid age
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('VALIDATION_ERROR');
  });
  
  it('should reject missing session', async () => {
    const response = await request(app)
      .post('/api/assessment/submit')
      .send(validAssessmentData);
    
    expect(response.status).toBe(401);
  });
});

describe('GET /api/assessment/:id/status', () => {
  it('should return assessment status', async () => {
    const response = await request(app)
      .get(`/api/assessment/${assessmentId}/status`)
      .set('Cookie', `sid=${validSessionId}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBeDefined();
  });
});

describe('GET /api/assessment/:id/results', () => {
  it('should return results when completed', async () => {
    const response = await request(app)
      .get(`/api/assessment/${completedAssessmentId}/results`)
      .set('Cookie', `sid=${validSessionId}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data.recommendations).toBeDefined();
  });
});
```

});

### 3.2 Event Flow Integration Tests

```typescript
// tests/integration/event-flow.test.ts
describe('Event-Driven Assessment Flow', () => {
  it('should publish assessment_submitted event on submit', async () => {
    let publishedEvent = null;
    
    // Mock message broker
    const mockBroker = {
      publish: jest.fn((event, data) => {
        publishedEvent = { event, data };
        return Promise.resolve();
      })
    };
    
    // Submit assessment
    const response = await request(app)
      .post('/api/assessment/submit')
      .set('Authorization', `Bearer ${validToken}`)
      .send(validAssessmentData);
    
    expect(response.status).toBe(202);
    
    // Verify event was published
    expect(mockBroker.publish).toHaveBeenCalledWith(
      'assessment_submitted',
      expect.objectContaining({
        assessment_id: response.body.data.assessment_id,
        session_id: expect.any(String),
        answers: validAssessmentData
      })
    );
  });
  
  it('should process assessment_submitted event in AI-worker', async () => {
    const eventData = {
      assessment_id: 'test-id',
      session_id: 'session-id',
      answers: validAssessmentData
    };
    
    // Mock AI service
    const mockAIService = jest.fn().mockResolvedValue({
      recommendations: { primary_instrument: 'Guitar' }
    });
    
    // Simulate event consumption
    await processAssessmentEvent(eventData);
    
    // Verify AI service was called
    expect(mockAIService).toHaveBeenCalled();
    
    // Verify results saved to DB
    const results = await db.resultTest.findByAssessmentId('test-id');
    expect(results.recommendations.primary_instrument).toBe('Guitar');
  });
});

### 3.3 Database Integration Tests

```typescript
// tests/integration/database.test.ts
describe('Database Operations', () => {
  beforeEach(async () => {
    await db.testAssessment.deleteAll();
  });
  
  it('should save assessment to database', async () => {
    const data = { session_id: 'session-1', age: 25 };
    const result = await db.testAssessment.create(data);
    
    expect(result.id).toBeDefined();
    expect(result.status).toBe('submitted');
  });
  
  it('should update assessment status', async () => {
    const assessment = await db.testAssessment.create({ /* ... */ });
    await db.testAssessment.update(assessment.id, { status: 'processing' });
    
    const updated = await db.testAssessment.findById(assessment.id);
    expect(updated.status).toBe('processing');
  });
});
```

### 3.3 Queue Integration Tests

```typescript
// tests/integration/queue.test.ts
describe('Redis Queue Operations', () => {
  beforeEach(async () => {
    await redis.del('answers_received');
    await redis.del('answers_saved');
  });
  
  it('should publish and consume messages', async () => {
    const message = { assessment_id: 'test-1' };
    
    await redis.lpush('answers_received', JSON.stringify(message));
    const retrieved = await redis.rpop('answers_received');
    
    expect(JSON.parse(retrieved)).toEqual(message);
  });
});
```

## 4. End-to-End Tests

### 4.1 Complete Workflow Test

```typescript
// tests/e2e/workflow.test.ts
describe('Complete Assessment Workflow', () => {
  it('should process assessment from submission to results', async () => {
    // 1. Submit assessment
    const submitResponse = await request(app)
      .post('/api/assessment/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(validAssessmentData);
    
    expect(submitResponse.status).toBe(202);
    const assessmentId = submitResponse.body.data.assessment_id;
    
    // 2. Poll for completion
    let status = 'submitted';
    let attempts = 0;
    while (status !== 'completed' && attempts < 30) {
      await sleep(1000);
      const statusResponse = await request(app)
        .get(`/api/assessment/${assessmentId}/status`)
        .set('Authorization', `Bearer ${token}`);
      
      status = statusResponse.body.data.status;
      attempts++;
    }
    
    expect(status).toBe('completed');
    
    // 3. Get results
    const resultsResponse = await request(app)
      .get(`/api/assessment/${assessmentId}/results`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(resultsResponse.status).toBe(200);
    expect(resultsResponse.body.data.recommendations).toBeDefined();
    expect(resultsResponse.body.data.analysis).toBeDefined();
  });
});
```

## 5. Performance Tests

### 5.1 Load Testing

```typescript
// tests/performance/load.test.ts
describe('Load Testing', () => {
  it('should handle 100 concurrent submissions', async () => {
    const promises = [];
    
    for (let i = 0; i < 100; i++) {
      promises.push(
        request(app)
          .post('/api/assessment/submit')
          .set('Authorization', `Bearer ${token}`)
          .send(validAssessmentData)
      );
    }
    
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.status === 202).length;
    
    expect(successCount).toBeGreaterThan(95); // 95% success rate
  });
});
```

### 5.2 Response Time Tests

```typescript
// tests/performance/response-time.test.ts
describe('Response Time', () => {
  it('should submit assessment in < 500ms', async () => {
    const start = Date.now();
    
    await request(app)
      .post('/api/assessment/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(validAssessmentData);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
  
  it('should get status in < 100ms', async () => {
    const start = Date.now();
    
    await request(app)
      .get(`/api/assessment/${assessmentId}/status`)
      .set('Authorization', `Bearer ${token}`);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```

## 6. Test Configuration

### 6.1 Jest Configuration

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### 6.2 Test Fixtures

```typescript
// tests/fixtures/assessment.ts
export const validAssessmentData = {
  age: 25,
  practice_hours_per_week: 5,
  goals: ['Hobi/relax'],
  preferred_genres: ['Pop'],
  // ... all required fields
};

export const validSessionId = 'abc123def456ghi789';
```

## 7. Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/validation.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run only integration tests
npm test -- --testPathPattern=integration

# Run only e2e tests
npm test -- --testPathPattern=e2e
```

## 8. Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Statements | 80% | - |
| Branches | 80% | - |
| Functions | 80% | - |
| Lines | 80% | - |

## 9. Continuous Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v2
```

