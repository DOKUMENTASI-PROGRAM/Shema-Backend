# Testing Strategy & Best Practices

## Testing Philosophy

### Testing Pyramid
```
        /\
       /  \        E2E Tests (Few)
      /────\       - Test critical user flows
     /      \      - Slow, expensive
    /────────\     Integration Tests (Some)
   /          \    - Test API endpoints
  /────────────\   - Test service interactions
 /              \  Unit Tests (Many)
/────────────────\ - Test individual functions
                   - Fast, cheap, isolated
```

### Test Coverage Goals
- **Unit Tests**: >80% code coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user flows
- **Focus**: High-value, high-risk areas

---

## Unit Testing

### What to Test
- Service layer business logic
- Utility functions
- Data transformations
- Validation logic
- Error handling

### Unit Test Structure (AAA Pattern with Bun)

```typescript
// services/courseService.test.ts
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { courseService } from './courseService';
import { courseRepository } from '../models/courseRepository';

// Mock dependencies with Bun
mock.module('../models/courseRepository');

describe('CourseService', () => {
  describe('createCourse', () => {
    // Arrange
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    it('should create a course with valid data', async () => {
      // Arrange
      const courseData = {
        name: 'Guitar Basics',
        price: 50000,
        duration_minutes: 60,
        category: 'guitar',
        level: 'beginner'
      };
      const instructorId = 'instructor-uuid-123';
      
      const mockCourse = {
        id: 'course-uuid-1',
        ...courseData,
        instructor_id: instructorId
      };
      
      courseRepository.countByInstructor.mockResolvedValue(5);
      courseRepository.create.mockResolvedValue(mockCourse);
      
      // Act
      const result = await courseService.createCourse(courseData, instructorId);
      
      // Assert
      expect(result).toEqual(mockCourse);
      expect(courseRepository.countByInstructor).toHaveBeenCalledWith(instructorId);
      expect(courseRepository.create).toHaveBeenCalledWith({
        ...courseData,
        instructor_id: instructorId
      });
    });
    
    it('should throw ValidationError for negative price', async () => {
      // Arrange
      const courseData = {
        name: 'Guitar Basics',
        price: -1000,  // Invalid
        duration_minutes: 60
      };
      const instructorId = 'instructor-uuid-123';
      
      // Act & Assert
      await expect(
        courseService.createCourse(courseData, instructorId)
      ).rejects.toThrow('Price must be positive');
    });
    
    it('should throw BusinessError when instructor reaches course limit', async () => {
      // Arrange
      const courseData = {
        name: 'Guitar Basics',
        price: 50000,
        duration_minutes: 60
      };
      const instructorId = 'instructor-uuid-123';
      
      courseRepository.countByInstructor.mockResolvedValue(10);  // At limit
      
      // Act & Assert
      await expect(
        courseService.createCourse(courseData, instructorId)
      ).rejects.toThrow('Instructor has reached maximum course limit');
      
      expect(courseRepository.create).not.toHaveBeenCalled();
    });
  });
});
```

### Testing Utilities

```javascript
// utils/validation.test.js
const { validatePassword } = require('./validation');

describe('validatePassword', () => {
  it('should pass for valid password', () => {
    const errors = validatePassword('SecurePass123!');
    expect(errors).toHaveLength(0);
  });
  
  it('should fail for password too short', () => {
    const errors = validatePassword('Short1!');
    expect(errors).toContain('Password must be at least 8 characters');
  });
  
  it('should fail for password without uppercase', () => {
    const errors = validatePassword('lowercase123!');
    expect(errors).toContain('Password must contain at least one uppercase letter');
  });
  
  it('should return multiple errors for invalid password', () => {
    const errors = validatePassword('short');
    expect(errors.length).toBeGreaterThan(1);
  });
});
```

---

## Integration Testing

### What to Test
- API endpoints
- Request/response flow
- Authentication/authorization
- Database interactions
- Service-to-service communication

### Setup Test Database

```javascript
// tests/setup.js
const { Pool } = require('pg');

let testPool;

async function setupTestDatabase() {
  testPool = new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || 5432,
    database: process.env.TEST_DB_NAME || 'identity_db_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres'
  });
  
  // Run migrations
  await runMigrations(testPool);
}

async function teardownTestDatabase() {
  // Clean all tables
  await testPool.query('TRUNCATE TABLE users, refresh_tokens CASCADE');
  await testPool.end();
}

module.exports = { setupTestDatabase, teardownTestDatabase, testPool };
```

### Integration Test Example

```javascript
// tests/integration/auth.test.js
const request = require('supertest');
const app = require('../../src/app');
const { setupTestDatabase, teardownTestDatabase, testPool } = require('../setup');

describe('Authentication Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });
  
  afterAll(async () => {
    await teardownTestDatabase();
  });
  
  beforeEach(async () => {
    // Clean data before each test
    await testPool.query('TRUNCATE TABLE users CASCADE');
  });
  
  describe('POST /v1/auth/instructor/login', () => {
    it('should login successfully with valid credentials', async () => {
      // Arrange - Create test user
      const password = 'SecurePass123!';
      const passwordHash = await bcrypt.hash(password, 12);
      
      await testPool.query(
        'INSERT INTO users (email, password_hash, role, name) VALUES ($1, $2, $3, $4)',
        ['instructor@test.com', passwordHash, 'instructor', 'Test Instructor']
      );
      
      // Act
      const response = await request(app)
        .post('/v1/auth/instructor/login')
        .send({
          email: 'instructor@test.com',
          password: password
        });
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toMatchObject({
        email: 'instructor@test.com',
        role: 'instructor'
      });
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });
    
    it('should fail with invalid password', async () => {
      // Arrange
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 12);
      
      await testPool.query(
        'INSERT INTO users (email, password_hash, role, name) VALUES ($1, $2, $3, $4)',
        ['instructor@test.com', passwordHash, 'instructor', 'Test Instructor']
      );
      
      // Act
      const response = await request(app)
        .post('/v1/auth/instructor/login')
        .send({
          email: 'instructor@test.com',
          password: 'WrongPassword123!'
        });
      
      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
    
    it('should fail with non-existent email', async () => {
      // Act
      const response = await request(app)
        .post('/v1/auth/instructor/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SomePassword123!'
        });
      
      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });
  
  describe('GET /v1/me', () => {
    let authToken;
    let userId;
    
    beforeEach(async () => {
      // Create and login user
      const passwordHash = await bcrypt.hash('SecurePass123!', 12);
      
      const result = await testPool.query(
        'INSERT INTO users (email, password_hash, role, name) VALUES ($1, $2, $3, $4) RETURNING id',
        ['student@test.com', passwordHash, 'student', 'Test Student']
      );
      
      userId = result.rows[0].id;
      
      // Login to get token
      const loginResponse = await request(app)
        .post('/v1/auth/student/login')
        .send({
          email: 'student@test.com',
          password: 'SecurePass123!'
        });
      
      authToken = loginResponse.body.data.token;
    });
    
    it('should return user profile with valid token', async () => {
      // Act
      const response = await request(app)
        .get('/v1/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: userId,
        email: 'student@test.com',
        role: 'student',
        name: 'Test Student'
      });
    });
    
    it('should fail without token', async () => {
      // Act
      const response = await request(app).get('/v1/me');
      
      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
    
    it('should fail with invalid token', async () => {
      // Act
      const response = await request(app)
        .get('/v1/me')
        .set('Authorization', 'Bearer invalid-token');
      
      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });
});
```

### Testing Course Service

```javascript
// tests/integration/courses.test.js
describe('Course Management Integration Tests', () => {
  let instructorToken;
  let studentToken;
  
  beforeEach(async () => {
    // Setup test users and get tokens
    instructorToken = await createTestUser('instructor');
    studentToken = await createTestUser('student');
  });
  
  describe('POST /v1/courses', () => {
    it('should create course as instructor', async () => {
      const response = await request(app)
        .post('/v1/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          name: 'Guitar Basics',
          description: 'Learn guitar fundamentals',
          price: 50000,
          duration_minutes: 60,
          category: 'guitar',
          level: 'beginner',
          schedule: ['Monday 10:00', 'Wednesday 14:00']
        });
      
      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('Guitar Basics');
    });
    
    it('should fail to create course as student', async () => {
      const response = await request(app)
        .post('/v1/courses')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'Guitar Basics',
          price: 50000,
          duration_minutes: 60
        });
      
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });
  
  describe('GET /v1/courses', () => {
    it('should return paginated courses', async () => {
      // Create test courses
      await createTestCourses(5);
      
      const response = await request(app)
        .get('/v1/courses?page=1&limit=3');
      
      expect(response.status).toBe(200);
      expect(response.body.data.courses).toHaveLength(3);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 3,
        total: 5,
        total_pages: 2
      });
    });
  });
});
```

---

## Testing Middleware

### Authentication Middleware Tests

```javascript
// middleware/auth.test.js
const authMiddleware = require('./auth');
const jwt = require('jsonwebtoken');

describe('Auth Middleware', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });
  
  it('should pass with valid token', async () => {
    const token = jwt.sign(
      { id: 'user-123', role: 'instructor' },
      process.env.JWT_SECRET
    );
    
    req.headers.authorization = `Bearer ${token}`;
    
    await authMiddleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({
      id: 'user-123',
      role: 'instructor'
    });
  });
  
  it('should fail without token', async () => {
    await authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED'
        })
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
```

---

## Testing ChatGPT Integration

### Mock ChatGPT API

```javascript
// services/chatService.test.js
const chatService = require('./chatService');
const openai = require('../config/openai');

jest.mock('../config/openai');

describe('ChatService', () => {
  describe('sendMessage', () => {
    it('should send message and get response', async () => {
      // Mock OpenAI response
      openai.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'I recommend our Guitar Basics course for beginners.'
          }
        }],
        usage: {
          total_tokens: 150
        }
      });
      
      const response = await chatService.sendMessage(
        'session-123',
        'What guitar course do you recommend for beginners?'
      );
      
      expect(response).toContain('Guitar Basics');
      expect(openai.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.any(String)
            })
          ])
        })
      );
    });
    
    it('should handle ChatGPT API error', async () => {
      openai.chat.completions.create.mockRejectedValue(
        new Error('API rate limit exceeded')
      );
      
      await expect(
        chatService.sendMessage('session-123', 'Hello')
      ).rejects.toThrow('API rate limit exceeded');
    });
  });
  
  describe('context management', () => {
    it('should limit context to MAX_CONTEXT_MESSAGES', async () => {
      // Create session with many messages
      await createTestMessages('session-123', 15);
      
      openai.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: { total_tokens: 100 }
      });
      
      await chatService.sendMessage('session-123', 'New message');
      
      const call = openai.chat.completions.create.mock.calls[0][0];
      expect(call.messages.length).toBeLessThanOrEqual(10);
    });
  });
});
```

---

## Test Fixtures & Factories

### Test Data Factories

```javascript
// tests/factories/userFactory.js
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function createTestUser(role = 'student', overrides = {}) {
  const defaultData = {
    id: uuidv4(),
    email: `test-${Date.now()}@example.com`,
    password_hash: await bcrypt.hash('SecurePass123!', 12),
    role: role,
    name: `Test ${role}`,
    is_active: true,
    created_at: new Date()
  };
  
  return { ...defaultData, ...overrides };
}

async function createTestCourse(instructorId, overrides = {}) {
  const defaultData = {
    id: uuidv4(),
    name: `Test Course ${Date.now()}`,
    description: 'Test course description',
    price: 50000,
    instructor_id: instructorId,
    instructor_name: 'Test Instructor',
    duration_minutes: 60,
    max_students: 10,
    current_students: 0,
    category: 'guitar',
    level: 'beginner',
    schedule: ['Monday 10:00'],
    is_published: true,
    created_at: new Date()
  };
  
  return { ...defaultData, ...overrides };
}

module.exports = { createTestUser, createTestCourse };
```

---

## Test Configuration

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/config/**',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000
};
```

### package.json Scripts (Bun)

```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "test:unit": "bun test --testNamePattern=unit",
    "test:integration": "bun test --testNamePattern=integration"
  }
}
```

**Note**: Bun's test runner is built-in and extremely fast - no need to install Jest or Vitest!

---

## Continuous Integration Testing

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Run Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest
    
    - name: Install dependencies
      run: |
        cd services/identity-service
        bun install --frozen-lockfile
    
    - name: Run tests
      env:
        NODE_ENV: test
        TEST_DB_HOST: localhost
        TEST_DB_NAME: identity_db_test
        TEST_DB_USER: postgres
        TEST_DB_PASSWORD: postgres
        FIREBASE_PROJECT_ID: test-project
      run: |
        cd services/identity-service
        bun test
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./services/identity-service/coverage/lcov.info
```

---

## Testing Best Practices

### 1. Test Naming Convention
```javascript
// ✅ Good - Descriptive test names
it('should return 401 when token is missing')
it('should create course with valid instructor credentials')

// ❌ Bad - Vague test names
it('test auth')
it('works')
```

### 2. Use Test Isolation
```javascript
// ✅ Good - Clean state before each test
beforeEach(async () => {
  await testPool.query('TRUNCATE TABLE users CASCADE');
});

// ❌ Bad - Tests depend on each other
```

### 3. Test Both Success and Failure Cases
```javascript
describe('createCourse', () => {
  it('should create course with valid data');
  it('should fail with invalid price');
  it('should fail when instructor limit reached');
  it('should fail with missing required fields');
});
```

### 4. Don't Test Implementation Details
```javascript
// ✅ Good - Test behavior
expect(response.status).toBe(200);
expect(response.body.data).toHaveProperty('token');

// ❌ Bad - Test implementation
expect(jwt.sign).toHaveBeenCalled();
```

### 5. Use Descriptive Assertions
```javascript
// ✅ Good
expect(response.body.error.code).toBe('VALIDATION_ERROR');

// ❌ Bad
expect(response.body.error).toBeTruthy();
```

---

## Performance Testing

### Load Testing with Artillery

```yaml
# artillery-config.yml
config:
  target: 'http://localhost:8080'
  phases:
    - duration: 60
      arrivalRate: 10
  
scenarios:
  - name: "Login and get courses"
    flow:
      - post:
          url: "/v1/auth/student/login"
          json:
            email: "test@example.com"
            password: "SecurePass123!"
          capture:
            - json: "$.data.token"
              as: "token"
      
      - get:
          url: "/v1/courses"
          headers:
            Authorization: "Bearer {{ token }}"
```

Run with:
```bash
artillery run artillery-config.yml
```

---

## Testing Checklist

### Before Committing
- [ ] All tests passing
- [ ] Coverage threshold met (>80%)
- [ ] No console.log statements
- [ ] No commented-out test code
- [ ] Test names are descriptive

### Test Coverage
- [ ] Unit tests for services
- [ ] Integration tests for API endpoints
- [ ] Authentication/authorization tests
- [ ] Validation tests
- [ ] Error handling tests
- [ ] Edge cases covered
