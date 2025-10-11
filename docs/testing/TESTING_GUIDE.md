# Testing Guide - Shema Music Backend

Comprehensive guide for running integration tests against Remote Supabase (Production).

## Overview

This project uses **Jest** for testing with integration tests that verify all endpoints work correctly with the remote Supabase database (production environment).

### Test Coverage

- ✅ **Auth Service** - All authentication endpoints
- ✅ **Booking Service** - Course registration and booking management
- ⏳ **User Service** - User management (coming soon)
- ⏳ **Course Service** - Course catalog (coming soon)

---

## Prerequisites

Before running tests, ensure you have:

1. **Node.js** installed (v18 or higher)
2. **Redis** running locally or accessible
3. **Services running** (Auth, Booking, etc.)
4. **Remote Supabase credentials** configured in `.env.test`

### Check Prerequisites

```bash
# Check Node.js version
node --version  # Should be v18+

# Check if Redis is running
redis-cli ping  # Should return "PONG"
```

---

## Environment Setup

### 1. Configure Test Environment

The `.env.test` file already has remote Supabase credentials configured:

```bash
# .env.test
NODE_ENV=test

# Supabase Remote (Production)
SUPABASE_URL=https://xlrwvzwpecprhgzfcqxw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
SUPABASE_ANON_KEY=eyJhbGci...

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets
JWT_SECRET=test-jwt-secret-key-for-testing-only-minimum-32-chars
JWT_REFRESH_SECRET=test-jwt-refresh-secret-key-for-testing-only-minimum-32-chars
SERVICE_JWT_SECRET=test-service-jwt-secret-key-for-testing-only-minimum-32-chars

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
BOOKING_SERVICE_URL=http://localhost:3004
```

✅ **Note:** Tests are already configured to use remote Supabase!

---

## Running Tests

### Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install service-specific dependencies
cd services/auth
npm install

cd ../booking
npm install
```

### Step 2: Start Required Services

Open separate terminal windows for each service:

**Terminal 1 - Redis:**
```bash
redis-server
```

**Terminal 2 - Auth Service:**
```bash
cd services/auth
npm run dev
# Wait until you see: "✅ Auth Service running on http://localhost:3001"
```

**Terminal 3 - Booking Service:**
```bash
cd services/booking
npm run dev
# Wait until you see: "✅ Booking Service running on http://localhost:3004"
```

### Step 3: Run Tests

**Terminal 4 - Run Tests:**

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run specific test file
npm test -- services/auth/__tests__/authIntegration.test.ts

# Run tests with verbose output
npm test -- --verbose
```

### Using the Test Runner Script

We provide a convenient script to run tests against different environments:

```bash
# Run tests against remote Supabase (production)
npm run test:remote

# Run tests against local Supabase (if you have Supabase CLI running)
npm run test:local

# Check current environment status
npm run env:status
```

---

## Test Structure

### Auth Service Tests

**File:** `services/auth/__tests__/authIntegration.test.ts`

Tests cover:
- ✅ User Registration (Admin only)
  - Successful registration
  - Duplicate email rejection
  - Invalid email format
  - Weak password rejection
- ✅ User Login
  - Successful login with valid credentials
  - Invalid email/password rejection
  - Non-existent user handling
- ✅ Token Refresh
  - Valid refresh token renewal
  - Invalid refresh token rejection
- ✅ Get User Profile (`/me`)
  - Authenticated user profile retrieval
  - Missing token rejection
  - Invalid token rejection
- ✅ Logout
  - Successful logout
  - Token invalidation after logout

### Booking Service Tests

**File:** `services/booking/__tests__/bookingIntegration.test.ts`

Tests cover:
- ✅ Course Registration
  - New user course registration
  - Existing user booking
  - Idempotency key validation
  - Invalid course ID rejection
  - Email format validation
  - WA number format validation (+62 required)
  - Consent requirement
  - Preferred days validation
  - Duplicate pending booking prevention
- ✅ Booking Data Validation
  - 3-day expiration verification
  - Student profile creation
  - Guardian information handling

---

## Test Execution Flow

```
1. beforeAll() - Setup
   ├── Connect to Redis
   ├── Create test data (courses, etc.)
   └── Clean up any existing test data

2. Test Cases
   ├── POST /api/auth/register
   ├── POST /api/auth/login
   ├── POST /api/auth/refresh
   ├── GET /api/auth/me
   ├── POST /api/auth/logout
   ├── POST /api/bookings/register-course
   └── Data validation checks

3. afterAll() - Cleanup
   ├── Delete test users
   ├── Delete test bookings
   ├── Delete test courses
   └── Disconnect from Redis
```

---

## Understanding Test Results

### Successful Test Output

```
 PASS  services/auth/__tests__/authIntegration.test.ts
  Auth Service - HTTP Integration Tests
    POST /api/auth/register
      ✓ should register a new admin user successfully (521ms)
      ✓ should reject registration with existing email (145ms)
      ✓ should reject registration with invalid email (98ms)
    ...

Test Suites: 2 passed, 2 total
Tests:       16 passed, 16 total
Snapshots:   0 total
Time:        12.456 s
```

### Failed Test Example

```
 FAIL  services/auth/__tests__/authIntegration.test.ts
  ● Auth Service › POST /api/auth/register › should register successfully

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 500

      65 |       });
      66 | 
    > 67 |       expect(response.status).toBe(201);
         |                               ^
```

**Troubleshooting Failed Tests:**
1. Check if service is running (`http://localhost:3001/health`)
2. Check if Redis is connected
3. Review error messages in service logs
4. Verify `.env.test` configuration

---

## Manual Testing with cURL

You can also test endpoints manually:

### Auth Service

```bash
# Register Admin
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@shema-music.com",
    "password": "SecurePass123!",
    "full_name": "Admin User",
    "role": "admin",
    "phone_number": "+6281234567890"
  }'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@shema-music.com",
    "password": "SecurePass123!"
  }'

# Get Profile (use token from login response)
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Booking Service

```bash
# Register for Course
curl -X POST http://localhost:3004/api/bookings/register-course \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "wa_number": "+6281234567890",
    "email": "john@example.com",
    "course_id": "uuid-of-course",
    "experience_level": "beginner",
    "preferred_days": ["monday", "wednesday"],
    "preferred_time_range": {
      "start": "14:00",
      "end": "18:00"
    },
    "consent": true,
    "captcha_token": "test-token",
    "idempotency_key": "unique-uuid-here"
  }'
```

---

## Data Cleanup

Tests automatically clean up data in `afterAll()` hooks, but if tests fail or are interrupted:

### Manual Cleanup Script

```javascript
// cleanup-test-data.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.test' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanup() {
  // Delete test users (emails containing 'test-')
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .ilike('email', '%test-%');

  for (const user of users) {
    await supabase.from('bookings').delete().eq('user_id', user.id);
    await supabase.from('student_profiles').delete().eq('user_id', user.id);
    await supabase.from('users').delete().eq('id', user.id);
  }

  // Delete test courses
  const { data: courses } = await supabase
    .from('courses')
    .select('id')
    .ilike('title', '%Test%');

  for (const course of courses) {
    await supabase.from('courses').delete().eq('id', course.id);
  }

  console.log('✅ Cleanup complete');
}

cleanup();
```

Run cleanup:
```bash
node cleanup-test-data.js
```

---

## Continuous Integration (CI)

For GitHub Actions or other CI/CD:

```yaml
# .github/workflows/test.yml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Start Auth Service
        run: |
          cd services/auth
          npm install
          npm run dev &
          sleep 5
      
      - name: Start Booking Service
        run: |
          cd services/booking
          npm install
          npm run dev &
          sleep 5
      
      - name: Run tests
        run: npm test
        env:
          NODE_ENV: test
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

---

## Best Practices

1. **Always run cleanup** after tests (automated in `afterAll()`)
2. **Use unique identifiers** for test data (timestamps, UUIDs)
3. **Test against production** to catch real-world issues
4. **Monitor test duration** - optimize slow tests
5. **Check test coverage** - aim for >80%
6. **Isolate tests** - each test should be independent
7. **Use idempotency keys** for booking tests
8. **Verify data integrity** after operations

---

## Troubleshooting

### Issue: "Connection refused" errors

**Solution:** Ensure services are running:
```bash
# Check Auth Service
curl http://localhost:3001/health

# Check Booking Service
curl http://localhost:3004/health
```

### Issue: "Redis connection failed"

**Solution:** Start Redis:
```bash
redis-server
```

### Issue: Tests are slow

**Solution:** 
- Reduce test timeout in `jest.config.js`
- Use parallel test execution
- Optimize database queries

### Issue: "Test data not cleaned up"

**Solution:** Run manual cleanup script or:
```bash
# Reset test environment
npm run env:status
npm run test:remote -- --forceExit
```

---

## Performance Benchmarks

Expected test execution times:

- **Auth Service Tests:** ~8-12 seconds (6 test cases)
- **Booking Service Tests:** ~15-20 seconds (10 test cases)
- **Total Suite:** ~25-35 seconds

---

## Next Steps

1. ✅ Run `npm test` to execute all tests
2. ✅ Review test results and coverage
3. ⏳ Add tests for User Service
4. ⏳ Add tests for Course Service
5. ⏳ Set up CI/CD pipeline
6. ⏳ Add performance/load tests

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
- [Project Architecture Docs](../architecture/architecture-overview.md)
- [API Endpoints Reference](../development/api-endpoints.md)

---

**Questions or Issues?** Check the main README or contact the development team.
