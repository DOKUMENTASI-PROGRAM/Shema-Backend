# Best Practices Guide
## Shema Music Backend Development Standards

---

## Table of Contents
1. [Code Style & Formatting](#code-style--formatting)
2. [TypeScript Best Practices](#typescript-best-practices)
3. [Error Handling](#error-handling)
4. [Security](#security)
5. [Service Communication](#service-communication)
6. [Database Practices](#database-practices)
7. [Testing](#testing)
8. [Git Workflow](#git-workflow)

---

## Code Style & Formatting

### General Rules
- ✅ Use TypeScript strict mode
- ✅ Use 2 spaces for indentation
- ✅ Use single quotes for strings
- ✅ Use semicolons at the end of statements
- ✅ Maximum line length: 100 characters
- ✅ Use meaningful variable names

### Naming Conventions
```typescript
// Constants - UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3
const DATABASE_URL = process.env.DATABASE_URL

// Variables - camelCase
const userId = '123'
const isAuthenticated = true

// Functions - camelCase with verb prefix
const getUserProfile = async (userId: string) => { }
const validateInput = (data: any) => { }

// Classes - PascalCase
class UserController { }
class BookingService { }

// Interfaces/Types - PascalCase with 'I' prefix for interfaces
interface IUser { }
type UserRole = 'student' | 'teacher' | 'admin'

// Files - kebab-case
// auth-controller.ts
// user-service.ts
// booking-routes.ts
```

### File Organization
```typescript
// 1. Imports (grouped and sorted)
import { Hono } from 'hono'
import { cors } from 'hono/cors'

// 2. Type definitions
interface UserData { }

// 3. Constants
const MAX_USERS = 100

// 4. Main code
const app = new Hono()

// 5. Exports
export default app
```

---

## TypeScript Best Practices

### Always Define Types
```typescript
// ❌ Bad
const getUserData = (id) => { }

// ✅ Good
const getUserData = (id: string): Promise<User | null> => { }
```

### Use Interfaces for Objects
```typescript
// ✅ Good
interface User {
  id: string
  email: string
  role: 'student' | 'teacher' | 'admin'
  createdAt: Date
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ErrorDetails
}
```

### Use Type Guards
```typescript
// ✅ Good
function isUser(obj: any): obj is User {
  return obj && typeof obj.id === 'string' && typeof obj.email === 'string'
}

if (isUser(data)) {
  // TypeScript knows data is User here
  console.log(data.email)
}
```

### Use Enums for Constants
```typescript
// ✅ Good
enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin'
}

enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}
```

---

## Error Handling

### Standard Error Response Format
```typescript
// Always return this format
interface ErrorResponse {
  success: false
  error: {
    code: string          // Machine-readable error code
    message: string       // Human-readable message
    details?: any        // Additional info (dev only)
  }
}

// Example
return c.json({
  success: false,
  error: {
    code: 'USER_NOT_FOUND',
    message: 'User with this ID does not exist',
    details: process.env.NODE_ENV === 'development' ? { userId } : undefined
  }
}, 404)
```

### Error Code Naming Convention
```typescript
// Format: RESOURCE_ACTION_RESULT
'USER_NOT_FOUND'
'AUTH_INVALID_CREDENTIALS'
'BOOKING_SLOT_UNAVAILABLE'
'VALIDATION_INVALID_EMAIL'
'SERVICE_UNAVAILABLE'
'DATABASE_CONNECTION_ERROR'
```

### Try-Catch Pattern
```typescript
// ✅ Good
async function getUser(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    if (!data) throw new Error('USER_NOT_FOUND')
    
    return data
  } catch (error) {
    console.error('Error in getUser:', error)
    throw error
  }
}
```

### Custom Error Classes
```typescript
// ✅ Good
class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}

// Usage
throw new ServiceError('USER_NOT_FOUND', 'User does not exist', 404, { userId })
```

---

## Security

### Environment Variables
```typescript
// ❌ Bad - Hardcoded secrets
const JWT_SECRET = 'my-secret-key'
const DATABASE_URL = 'postgresql://user:pass@host:5432/db'

// ✅ Good - Use environment variables
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET not configured')
```

### Password Hashing
```typescript
import bcrypt from 'bcrypt'

// ✅ Always hash passwords
const hashedPassword = await bcrypt.hash(password, 10)

// ✅ Always compare hashed passwords
const isValid = await bcrypt.compare(password, hashedPassword)
```

### Input Validation
```typescript
// ✅ Always validate and sanitize input
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2).max(100)
})

const result = userSchema.safeParse(input)
if (!result.success) {
  return c.json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details: result.error.errors
    }
  }, 400)
}
```

### SQL Injection Prevention
```typescript
// ✅ Good - Parameterized queries (Supabase handles this)
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', userEmail) // Safe - parameterized

// ❌ Bad - String concatenation (DON'T DO THIS)
const query = `SELECT * FROM users WHERE email = '${userEmail}'`
```

### CORS Configuration
```typescript
// ✅ Good - Environment-aware
const corsOrigin = process.env.NODE_ENV === 'development' 
  ? '*' 
  : process.env.CORS_ALLOWED_ORIGINS?.split(',')

app.use('*', cors({
  origin: corsOrigin,
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))
```

---

## Service Communication

### Use Shared Utilities
```typescript
// ✅ Good - Use callService utility
import { callService } from '../../../shared/utils/serviceCall'

const result = await callService('http://user-service:3002/api/users/123', {
  method: 'GET',
  timeout: 5000,
  retries: 2
})

if (!result.success) {
  // Handle error
  return c.json(result, 503)
}

return c.json(result)
```

### Service Authentication
```typescript
// ✅ Good - Include service identification
const headers = {
  'Content-Type': 'application/json',
  'X-Service-Name': process.env.SERVICE_NAME,
  'X-Service-Token': process.env.SERVICE_JWT_SECRET
}
```

### Timeout Handling
```typescript
// ✅ Good - Always set timeouts
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 10000)

try {
  const response = await fetch(url, {
    signal: controller.signal,
    headers
  })
  clearTimeout(timeoutId)
  return response
} catch (error) {
  clearTimeout(timeoutId)
  if (error.name === 'AbortError') {
    throw new ServiceError('SERVICE_TIMEOUT', 'Service call timeout', 504)
  }
  throw error
}
```

### Circuit Breaker Pattern
```typescript
// ✅ Good - Use for critical services
import { CircuitBreaker } from '../../../shared/utils/serviceCall'

const breaker = new CircuitBreaker(5, 60000)

const data = await breaker.call(async () => {
  return await callService(url, options)
})
```

---

## Database Practices

### Connection Management
```typescript
// ✅ Good - Single Supabase client instance
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### Query Patterns
```typescript
// ✅ Good - Always handle errors
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()

if (error) {
  console.error('Database error:', error)
  throw new ServiceError('DATABASE_ERROR', 'Failed to fetch user', 500)
}

// ✅ Good - Use select to limit fields
const { data } = await supabase
  .from('users')
  .select('id, email, full_name') // Only what you need
  .eq('role', 'student')
```

### Transactions
```typescript
// ✅ Good - Use RPC for complex transactions
const { data, error } = await supabase.rpc('create_booking_transaction', {
  user_id: userId,
  course_id: courseId,
  slot_ids: [slotId1, slotId2]
})
```

---

## Testing

### Unit Tests
```typescript
// ✅ Good - Test individual functions
describe('User Service', () => {
  test('should validate email format', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('invalid')).toBe(false)
  })
  
  test('should hash password correctly', async () => {
    const hashed = await hashPassword('password123')
    expect(hashed).not.toBe('password123')
    expect(await comparePassword('password123', hashed)).toBe(true)
  })
})
```

### Integration Tests
```typescript
// ✅ Good - Test API endpoints
describe('Auth API', () => {
  test('POST /register should create new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        fullName: 'Test User'
      })
    
    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.user).toBeDefined()
  })
})
```

---

## Git Workflow

### Commit Messages
```bash
# Format: <type>(<scope>): <subject>

# Types: feat, fix, docs, style, refactor, test, chore

# Examples:
feat(auth): add Firebase authentication support
fix(booking): resolve slot availability check bug
docs(api): update API endpoint documentation
refactor(gateway): improve error handling pattern
test(user): add unit tests for user validation
chore(deps): update dependencies
```

### Branch Naming
```bash
# Format: <type>/<description>

feature/add-recommendation-service
bugfix/booking-slot-race-condition
hotfix/security-cors-vulnerability
refactor/standardize-error-handling
docs/update-api-documentation
```

### Pull Request Checklist
```markdown
- [ ] Code follows style guide
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No hardcoded credentials
- [ ] Error handling implemented
- [ ] Logging added
- [ ] Environment variables documented
```

---

## API Design

### RESTful Conventions
```typescript
// ✅ Good
GET    /api/users           // List users
GET    /api/users/:id       // Get single user
POST   /api/users           // Create user
PUT    /api/users/:id       // Update user (full)
PATCH  /api/users/:id       // Update user (partial)
DELETE /api/users/:id       // Delete user

// Nested resources
GET    /api/courses/:id/schedules
POST   /api/bookings/:id/confirm
```

### Response Format
```typescript
// ✅ Good - Success response
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "meta": {
      "total": 100,
      "page": 1,
      "pageSize": 20
    }
  }
}

// ✅ Good - Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": { /* validation errors */ }
  }
}
```

---

## Performance

### Caching Strategy
```typescript
// ✅ Good - Cache frequently accessed data
import { redis } from './config/redis'

const cacheKey = `course:${courseId}`
const cached = await redis.get(cacheKey)

if (cached) {
  return JSON.parse(cached)
}

const data = await fetchFromDatabase()
await redis.setex(cacheKey, 3600, JSON.stringify(data)) // 1 hour TTL
return data
```

### Database Optimization
```typescript
// ✅ Good - Use indexes
// Create index in migration:
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);

// ✅ Good - Limit and paginate
const { data } = await supabase
  .from('users')
  .select('*')
  .range(0, 19) // First 20 records
  .order('created_at', { ascending: false })
```

---

## Monitoring & Logging

### Structured Logging
```typescript
// ✅ Good - Structured logs
console.log(JSON.stringify({
  level: 'info',
  service: 'auth-service',
  message: 'User logged in',
  userId: user.id,
  timestamp: new Date().toISOString()
}))

// ✅ Good - Error logging
console.error(JSON.stringify({
  level: 'error',
  service: 'booking-service',
  message: 'Failed to create booking',
  error: error.message,
  stack: error.stack,
  userId,
  timestamp: new Date().toISOString()
}))
```

---

## Summary Checklist

Before submitting code, ensure:
- [ ] No hardcoded credentials or secrets
- [ ] All inputs are validated
- [ ] Errors are properly handled and logged
- [ ] Types are defined for all functions
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] CORS is configured correctly
- [ ] Timeouts are set for external calls
- [ ] Database queries are optimized
- [ ] Security best practices followed

---

**Last Updated**: October 11, 2025  
**Version**: 2.0.0
