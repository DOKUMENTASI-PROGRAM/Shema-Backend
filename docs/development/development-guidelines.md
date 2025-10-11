# Development Guidelines

Panduan coding practices, patterns, dan conventions untuk development backend Shema Music.

**⚠️ IMPORTANT**: Authentication model:
- **Admin**: Firebase Authentication
- **Students & Instructors**: NO authentication

## Table of Contents
1. [Authentication Pattern (Firebase)](#authentication-pattern-firebase)
2. [Public Endpoint Security](#public-endpoint-security)
3. [Supabase Integration](#supabase-integration)
4. [Redis Usage](#redis-usage)
5. [Error Handling](#error-handling)
6. [Code Structure](#code-structure)
7. [Testing Practices](#testing-practices)

---

## Authentication Pattern (Firebase)

### Firebase Admin SDK Setup
```typescript
// services/auth/src/config/firebase-admin.ts
import admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  })
}

export default admin
```

### Firebase Token Verification Middleware
```typescript
// middleware/firebase-auth.ts
import { Context, Next } from 'hono'
import admin from '../config/firebase-admin'

export async function verifyFirebaseToken(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401)
    }

    const idToken = authHeader.substring(7)
    const decodedToken = await admin.auth().verifyIdToken(idToken)

    // Attach to context
    c.set('firebaseUser', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified
    })

    await next()
  } catch (error) {
    console.error('Firebase token verification failed:', error)
    return c.json({ 
      error: 'Invalid or expired token',
      code: 'AUTH_TOKEN_INVALID'
    }, 401)
  }
}
```

### Admin-Only Route Protection
```typescript
// services/auth/src/routes/admin.ts
import { Hono } from 'hono'
import { verifyFirebaseToken } from '../middleware/firebase-auth'

const app = new Hono()

// ❌ NO public registration endpoints
// ❌ NO student/instructor login endpoints

// ✅ Admin login ONLY
app.post('/api/auth/admin/login', verifyFirebaseToken, async (c) => {
  const firebaseUser = c.get('firebaseUser')
  
  // Get admin profile from User Service
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('firebase_uid', firebaseUser.uid)
    .eq('role', 'admin')
    .single()

  if (!user) {
    return c.json({ error: 'Admin account not found' }, 404)
  }

  // Update last login
  await supabase
    .from('users')
    .update({ last_login_at: new Date() })
    .eq('id', user.id)

  return c.json({
    success: true,
    data: {
      user_id: user.id,
      firebase_uid: user.firebase_uid,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    }
  })
})

// Admin-only endpoints
app.get('/api/auth/admin/me', verifyFirebaseToken, async (c) => {
  const firebaseUser = c.get('firebaseUser')
  
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('firebase_uid', firebaseUser.uid)
    .single()

  return c.json({ success: true, data: user })
})
```

### Role-Based Access Control (Admin Only)
```typescript
// middleware/require-admin.ts
export const requireAdmin = async (c: Context, next: Next) => {
  const firebaseUser = c.get('firebaseUser')
  
  if (!firebaseUser) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Check if user is admin
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('firebase_uid', firebaseUser.uid)
    .single()

  if (user?.role !== 'admin') {
    return c.json({ 
      error: 'Forbidden: Admin access required' 
    }, 403)
  }

  await next()
}

// Usage
app.get('/api/enrollments', 
  verifyFirebaseToken,
  requireAdmin,
  getEnrollmentsHandler
)
```

### ❌ NO Password Hashing Needed
```typescript
// Firebase handles password hashing automatically
// Students don't have passwords (no authentication)
// Instructors don't have passwords (no authentication)
```

### ❌ NO JWT Token Generation Needed
```typescript
// Firebase provides ID tokens automatically
// Backend only verifies tokens, doesn't generate them
```

---

## Public Endpoint Security

### Captcha Validation (Turnstile/reCAPTCHA)
```typescript
// middleware/captcha.ts
export async function validateCaptcha(c: Context, next: Next) {
  const { captcha_token } = await c.req.json()

  if (!captcha_token) {
    return c.json({ 
      error: 'Captcha token required',
      code: 'CAPTCHA_REQUIRED'
    }, 400)
  }

  // Validate with Cloudflare Turnstile
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: captcha_token
    })
  })

  const result = await response.json()

  if (!result.success) {
    return c.json({ 
      error: 'Invalid captcha',
      code: 'CAPTCHA_INVALID'
    }, 400)
  }

  await next()
}

// Usage in public enrollment endpoint
app.post('/api/enrollments', 
  validateCaptcha,
  createEnrollmentHandler
)
```

### Idempotency Key Validation
```typescript
// middleware/idempotency.ts
import { Context, Next } from 'hono'
import { redis } from '../config/redis'

export async function checkIdempotency(c: Context, next: Next) {
  const { idempotency_key } = await c.req.json()

  if (!idempotency_key) {
    return c.json({ 
      error: 'Idempotency key required',
      code: 'IDEMPOTENCY_KEY_REQUIRED'
    }, 400)
  }

  // Check if key already used
  const exists = await redis.get(`idempotency:${idempotency_key}`)
  
  if (exists) {
    return c.json({ 
      error: 'Duplicate submission detected',
      code: 'DUPLICATE_SUBMISSION'
    }, 409)
  }

  // Mark key as used (TTL 24 hours)
  await redis.setex(`idempotency:${idempotency_key}`, 86400, 'used')

  await next()
}

// Usage
app.post('/api/enrollments', 
  validateCaptcha,
  checkIdempotency,
  createEnrollmentHandler
)
```

### Rate Limiting for Public Endpoints
```typescript
// middleware/rate-limit.ts
import { Context, Next } from 'hono'
import { redis } from '../config/redis'

export function rateLimit(maxRequests: number, windowSeconds: number) {
  return async (c: Context, next: Next) => {
    // Get client IP (dari header X-Forwarded-For atau fallback)
    const clientIp = c.req.header('X-Forwarded-For')?.split(',')[0] || 
                     c.req.header('X-Real-IP') || 
                     'unknown'

    const key = `rate_limit:${clientIp}`
    
    // Increment counter
    const current = await redis.incr(key)
    
    // Set expiry on first request
    if (current === 1) {
      await redis.expire(key, windowSeconds)
    }

    // Check if exceeded
    if (current > maxRequests) {
      return c.json({ 
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retry_after: windowSeconds
      }, 429)
    }

    // Add rate limit headers
    c.header('X-RateLimit-Limit', maxRequests.toString())
    c.header('X-RateLimit-Remaining', (maxRequests - current).toString())

    await next()
  }
}

// Usage: Max 10 requests per 60 seconds untuk enrollment
app.post('/api/enrollments', 
  rateLimit(10, 60),
  validateCaptcha,
  checkIdempotency,
  createEnrollmentHandler
)
```

### Input Validation (Zod)
```typescript
// validators/enrollment.ts
import { z } from 'zod'

export const enrollmentSchema = z.object({
  full_name: z.string().min(3).max(255),
  wa_number: z.string().regex(/^\+62\d{9,13}$/),
  email: z.string().email(),
  course_id: z.string().uuid(),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
  time_preferences: z.string().max(500),
  preferred_days: z.array(z.enum([
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ])),
  preferred_time_range: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/)
  }),
  start_date_target: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guardian: z.object({
    name: z.string().min(3).max(255),
    wa_number: z.string().regex(/^\+62\d{9,13}$/)
  }).optional(),
  instrument_owned: z.boolean(),
  notes: z.string().max(1000).optional(),
  referral_source: z.string().max(100),
  consent: z.boolean().refine(val => val === true, {
    message: 'Consent is required'
  }),
  captcha_token: z.string(),
  idempotency_key: z.string().uuid()
})

// Usage
app.post('/api/enrollments', async (c) => {
  try {
    const body = await c.req.json()
    const validated = enrollmentSchema.parse(body)
    
    // Process enrollment with validated data
    const result = await createEnrollment(validated)
    
    return c.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors
      }, 400)
    }
    throw error
  }
})
```

---

## Supabase Integration

### Client Initialization
```typescript
// config/supabase.ts
import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
```

### Query Patterns

#### Simple Select
```typescript
export async function getUserById(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError('User not found')
    }
    throw new DatabaseError(error.message)
  }
  
  return data
}
```

#### Select with Relations (JOIN)
```typescript
export async function getEnrollmentWithDetails(enrollmentId: string) {
  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      *,
      student:users!student_id(id, full_name, email, wa_number),
      course:courses!course_id(id, title, level, price_per_session, duration_minutes)
    `)
    .eq('id', enrollmentId)
    .single()
  
  if (error) throw new DatabaseError(error.message)
  return data
}
```

#### Insert
```typescript
// Auto-create student user from enrollment
export async function createStudentUser(enrollmentData: CreateEnrollmentDto) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      email: enrollmentData.email,
      full_name: enrollmentData.full_name,
      wa_number: enrollmentData.wa_number,
      role: 'student',
      firebase_uid: null, // Students don't have Firebase accounts
      created_at: new Date()
    })
    .select()
    .single()
  
  if (error) {
    if (error.code === '23505') { // Unique violation
      throw new ConflictError('Email already exists')
    }
    throw new DatabaseError(error.message)
  }
  
  return data
}

// Insert enrollment
export async function createEnrollment(data: CreateEnrollmentDto) {
  const { data: enrollment, error } = await supabase
    .from('enrollments')
    .insert({
      student_id: data.student_id,
      course_id: data.course_id,
      registration_number: generateRegistrationNumber(),
      status: 'pending',
      experience_level: data.experience_level,
      time_preferences: data.time_preferences,
      preferred_days: data.preferred_days,
      idempotency_key: data.idempotency_key,
      created_at: new Date()
    })
    .select()
    .single()
  
  if (error) throw new DatabaseError(error.message)
  return enrollment
}
```

#### Update
```typescript
export async function updateUserLastLogin(userId: string) {
  const { error } = await supabase
    .from('users')
    .update({ last_login_at: new Date() })
    .eq('id', userId)
  
  if (error) throw new DatabaseError(error.message)
}
```

#### Delete (Soft Delete Recommended)
```typescript
export async function deleteUser(userId: string) {
  // Soft delete (recommended)
  const { error } = await supabase
    .from('users')
    .update({ deleted_at: new Date(), status: 'deleted' })
    .eq('id', userId)
  
  if (error) throw new DatabaseError(error.message)
}

// Hard delete (use with caution)
export async function hardDeleteUser(userId: string) {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)
  
  if (error) throw new DatabaseError(error.message)
}
```

#### Filtering & Pagination
```typescript
export async function getClassSchedules(
  courseId: string,
  page: number = 1,
  limit: number = 20
) {
  const offset = (page - 1) * limit
  
  const { data, error, count } = await supabase
    .from('class_schedules')
    .select(`
      *,
      course:courses(id, title, level),
      instructor:users!instructor_id(id, full_name),
      room:rooms(id, name, capacity)
    `, { count: 'exact' })
    .eq('course_id', courseId)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .range(offset, offset + limit - 1)
  
  if (error) throw new DatabaseError(error.message)
  
  return {
    data,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    }
  }
}
```

#### Transactions (RPC Function)
```typescript
// Supabase doesn't support transactions directly from client
// Use PostgreSQL function for complex transactions

// SQL migration:
// CREATE OR REPLACE FUNCTION approve_enrollment(
//   p_enrollment_id UUID
// ) RETURNS void AS $$
// BEGIN
//   UPDATE enrollments 
//   SET status = 'approved', approved_at = NOW()
//   WHERE id = p_enrollment_id;
//   
//   -- Additional logic: send notification, trigger events, etc.
// END;
// $$ LANGUAGE plpgsql;

// Call from TypeScript:
export async function approveEnrollment(enrollmentId: string) {
  const { error } = await supabase.rpc('approve_enrollment', {
    p_enrollment_id: enrollmentId
  })
  
  if (error) throw new DatabaseError(error.message)
}

// Complex transaction with class schedule and attendees
// CREATE OR REPLACE FUNCTION create_class_with_attendees(
//   p_course_id UUID,
//   p_instructor_id UUID,
//   p_room_id UUID,
//   p_start_time TIMESTAMP,
//   p_end_time TIMESTAMP,
//   p_student_ids UUID[]
// ) RETURNS UUID AS $$
// DECLARE
//   v_schedule_id UUID;
//   v_student_id UUID;
// BEGIN
//   -- Insert class schedule
//   INSERT INTO class_schedules (course_id, instructor_id, room_id, start_time, end_time)
//   VALUES (p_course_id, p_instructor_id, p_room_id, p_start_time, p_end_time)
//   RETURNING id INTO v_schedule_id;
//   
//   -- Insert attendees
//   FOREACH v_student_id IN ARRAY p_student_ids LOOP
//     INSERT INTO schedule_attendees (class_schedule_id, student_id, attended)
//     VALUES (v_schedule_id, v_student_id, false);
//   END LOOP;
//   
//   RETURN v_schedule_id;
// END;
// $$ LANGUAGE plpgsql;

export async function createClassWithAttendees(data: CreateClassDto) {
  const { data: scheduleId, error } = await supabase.rpc('create_class_with_attendees', {
    p_course_id: data.courseId,
    p_instructor_id: data.instructorId,
    p_room_id: data.roomId,
    p_start_time: data.startTime,
    p_end_time: data.endTime,
    p_student_ids: data.studentIds
  })
  
  if (error) throw new DatabaseError(error.message)
  return scheduleId
}
```

### Error Handling
```typescript
// Custom error classes
export class DatabaseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

// Global error handler
app.onError((err, c) => {
  if (err instanceof NotFoundError) {
    return c.json({ error: err.message }, 404)
  }
  
  if (err instanceof ConflictError) {
    return c.json({ error: err.message }, 409)
  }
  
  if (err instanceof DatabaseError) {
    console.error('Database error:', err)
    return c.json({ error: 'Database operation failed' }, 500)
  }
  
  console.error('Unexpected error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})
```

---

## Redis Usage

### Client Initialization
```typescript
// config/redis.ts
import { createClient } from 'redis'

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
})

redis.on('error', (err) => console.error('Redis Client Error', err))
redis.on('connect', () => console.log('Redis Client Connected'))

await redis.connect()

export { redis }
```

### Idempotency Key Storage
```typescript
// Store idempotency key with TTL (24 hours)
export async function storeIdempotencyKey(
  key: string,
  ttlSeconds: number = 86400 // 24 hours
) {
  await redis.setEx(`idempotency:${key}`, ttlSeconds, 'used')
}

// Check if idempotency key exists
export async function checkIdempotencyKey(key: string): Promise<boolean> {
  const exists = await redis.get(`idempotency:${key}`)
  return exists !== null
}
```

### Caching
```typescript
// Cache class schedules with TTL
export async function cacheClassSchedules(
  courseId: string,
  schedules: any[],
  ttlSeconds: number = 300 // 5 minutes
) {
  const key = `class_schedules:${courseId}`
  await redis.setEx(key, ttlSeconds, JSON.stringify(schedules))
}

// Get from cache
export async function getCachedClassSchedules(courseId: string): Promise<any[] | null> {
  const key = `class_schedules:${courseId}`
  const cached = await redis.get(key)
  return cached ? JSON.parse(cached) : null
}

// Cache invalidation
export async function invalidateClassScheduleCache(courseId: string) {
  await redis.del(`class_schedules:${courseId}`)
}

// Cache course catalog (public endpoint)
export async function cacheCourses(
  courses: any[],
  ttlSeconds: number = 3600 // 1 hour
) {
  await redis.setEx('courses:public', ttlSeconds, JSON.stringify(courses))
}

export async function getCachedCourses(): Promise<any[] | null> {
  const cached = await redis.get('courses:public')
  return cached ? JSON.parse(cached) : null
}

// Cache pattern for any data
export async function cacheData<T>(
  key: string,
  data: T,
  ttlSeconds: number
): Promise<void> {
  await redis.setEx(key, ttlSeconds, JSON.stringify(data))
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  const cached = await redis.get(key)
  return cached ? JSON.parse(cached) : null
}
```

### Pub/Sub
```typescript
// Publisher
export async function publishEvent(channel: string, event: any) {
  try {
    await redis.publish(channel, JSON.stringify(event))
    console.log(`Published event to ${channel}`)
  } catch (error) {
    console.error(`Failed to publish to ${channel}:`, error)
  }
}

// Subscriber (separate connection)
import { createClient } from 'redis'

const subscriber = createClient({ url: process.env.REDIS_URL })
await subscriber.connect()

export async function subscribeToChannel(
  channel: string, 
  handler: (message: any) => void
) {
  await subscriber.subscribe(channel, (message) => {
    try {
      const event = JSON.parse(message)
      handler(event)
    } catch (error) {
      console.error(`Failed to parse message from ${channel}:`, error)
    }
  })
  
  console.log(`Subscribed to ${channel}`)
}

// Pattern subscription
export async function subscribeToPattern(
  pattern: string,
  handler: (message: any, channel: string) => void
) {
  await subscriber.pSubscribe(pattern, (message, channel) => {
    try {
      const event = JSON.parse(message)
      handler(event, channel)
    } catch (error) {
      console.error(`Failed to parse message from ${channel}:`, error)
    }
  })
  
  console.log(`Subscribed to pattern ${pattern}`)
}
```

### Rate Limiting
```typescript
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const current = await redis.incr(key)
  
  if (current === 1) {
    await redis.expire(key, windowSeconds)
  }
  
  return current <= limit
}

// Usage: Rate limit login attempts
app.post('/api/auth/login', async (c) => {
  const { email } = await c.req.json()
  const rateLimitKey = `login_attempts:${email}`
  
  const allowed = await checkRateLimit(rateLimitKey, 5, 900) // 5 attempts per 15 min
  
  if (!allowed) {
    return c.json({ 
      error: 'Too many login attempts. Please try again later.' 
    }, 429)
  }
  
  // Continue with login logic...
})
```

---

## Error Handling

### Standard Error Response Format
```typescript
interface ErrorResponse {
  error: string        // User-friendly message
  code: string         // Error code for client handling
  details?: any        // Optional additional info
  timestamp: string
  path: string
}
```

### Error Codes Convention
```typescript
// Authentication errors (AUTH_*)
AUTH_FIREBASE_TOKEN_INVALID = 'AUTH_FIREBASE_TOKEN_INVALID'
AUTH_FIREBASE_TOKEN_EXPIRED = 'AUTH_FIREBASE_TOKEN_EXPIRED'
AUTH_ADMIN_ONLY = 'AUTH_ADMIN_ONLY'
AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED'
AUTH_FORBIDDEN = 'AUTH_FORBIDDEN'

// Validation errors (VALIDATION_*)
VALIDATION_INVALID_INPUT = 'VALIDATION_INVALID_INPUT'
VALIDATION_MISSING_FIELD = 'VALIDATION_MISSING_FIELD'
VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT'

// Enrollment errors (ENROLLMENT_*)
ENROLLMENT_COURSE_NOT_FOUND = 'ENROLLMENT_COURSE_NOT_FOUND'
ENROLLMENT_ALREADY_EXISTS = 'ENROLLMENT_ALREADY_EXISTS'
ENROLLMENT_COURSE_FULL = 'ENROLLMENT_COURSE_FULL'
ENROLLMENT_INVALID_DATA = 'ENROLLMENT_INVALID_DATA'

// Captcha errors (CAPTCHA_*)
CAPTCHA_REQUIRED = 'CAPTCHA_REQUIRED'
CAPTCHA_INVALID = 'CAPTCHA_INVALID'
CAPTCHA_VERIFICATION_FAILED = 'CAPTCHA_VERIFICATION_FAILED'

// Rate limit errors (RATE_LIMIT_*)
RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
DUPLICATE_SUBMISSION = 'DUPLICATE_SUBMISSION'
IDEMPOTENCY_KEY_REQUIRED = 'IDEMPOTENCY_KEY_REQUIRED'

// Database errors (DB_*)
DB_CONNECTION_FAILED = 'DB_CONNECTION_FAILED'
DB_QUERY_FAILED = 'DB_QUERY_FAILED'
DB_CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION'

// Service errors (SERVICE_*)
SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
SERVICE_TIMEOUT = 'SERVICE_TIMEOUT'

// Schedule errors (SCHEDULE_*)
SCHEDULE_ROOM_CONFLICT = 'SCHEDULE_ROOM_CONFLICT'
SCHEDULE_INSTRUCTOR_CONFLICT = 'SCHEDULE_INSTRUCTOR_CONFLICT'
SCHEDULE_INVALID_TIME_RANGE = 'SCHEDULE_INVALID_TIME_RANGE'
```

### Global Error Handler
```typescript
import { Hono } from 'hono'

const app = new Hono()

app.onError((err, c) => {
  console.error('Error occurred:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method
  })
  
  const response: ErrorResponse = {
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    path: c.req.path
  }
  
  // Map error types to status codes
  let status = 500
  
  if (err.name === 'NotFoundError') status = 404
  if (err.name === 'ValidationError') status = 400
  if (err.name === 'ConflictError') status = 409
  if (err.name === 'UnauthorizedError') status = 401
  if (err.name === 'ForbiddenError') status = 403
  
  return c.json(response, status)
})
```

### Input Validation
```typescript
import { z } from 'zod'

// Define schema for enrollment
const CreateEnrollmentSchema = z.object({
  full_name: z.string().min(3).max(255),
  wa_number: z.string().regex(/^\+62\d{9,13}$/),
  email: z.string().email(),
  course_id: z.string().uuid(),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
  preferred_days: z.array(z.string()),
  captcha_token: z.string(),
  idempotency_key: z.string().uuid()
})

// Validation middleware
export function validateBody(schema: z.ZodSchema) {
  return async (c, next) => {
    try {
      const body = await c.req.json()
      const validated = schema.parse(body)
      c.set('validatedBody', validated)
      await next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          error: 'Validation failed',
          code: 'VALIDATION_INVALID_INPUT',
          details: error.errors
        }, 400)
      }
      throw error
    }
  }
}

// Usage
app.post('/api/enrollments', 
  validateBody(CreateEnrollmentSchema),
  validateCaptcha,
  checkIdempotency,
  async (c) => {
    const validated = c.get('validatedBody')
    // Use validated data...
  }
)
```

---

## Code Structure

### Service-Level Structure
```
services/auth/
├── src/
│   ├── index.ts              # Main entry point
│   ├── routes/
│   │   └── auth.routes.ts    # Route definitions
│   ├── controllers/
│   │   └── auth.controller.ts # Request handlers
│   ├── services/
│   │   └── auth.service.ts    # Business logic
│   ├── models/
│   │   └── user.model.ts      # Database operations
│   ├── middleware/
│   │   └── auth.middleware.ts # Auth middleware
│   ├── validators/
│   │   └── auth.validator.ts  # Input validation
│   ├── types/
│   │   └── auth.types.ts      # TypeScript types
│   └── config/
│       ├── supabase.ts
│       └── redis.ts
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
├── .env.example
└── Dockerfile
```

### Separation of Concerns
```typescript
// routes/enrollment.routes.ts
import { Hono } from 'hono'
import * as controller from '../controllers/enrollment.controller'
import { validateBody } from '../middleware/validation'
import { validateCaptcha } from '../middleware/captcha'
import { checkIdempotency } from '../middleware/idempotency'
import { rateLimit } from '../middleware/rate-limit'
import { CreateEnrollmentSchema } from '../validators/enrollment.validator'

const router = new Hono()

router.post('/', 
  rateLimit(10, 60),
  validateBody(CreateEnrollmentSchema),
  validateCaptcha,
  checkIdempotency,
  controller.createEnrollment
)
router.get('/:id', controller.getEnrollment)

export default router

// controllers/enrollment.controller.ts
import * as service from '../services/enrollment.service'

export async function createEnrollment(c) {
  const data = c.get('validatedBody')
  
  const enrollment = await service.createEnrollment(data)
  
  return c.json({ 
    success: true,
    data: enrollment,
    message: 'Enrollment request submitted successfully'
  }, 201)
}

// services/enrollment.service.ts
import * as model from '../models/enrollment.model'
import * as userModel from '../models/user.model'
import { publishEvent } from '../config/redis'

export async function createEnrollment(data: CreateEnrollmentDto) {
  // Check if user exists, create if not
  let student = await userModel.findByEmail(data.email)
  
  if (!student) {
    student = await userModel.createStudent({
      email: data.email,
      full_name: data.full_name,
      wa_number: data.wa_number
    })
  }
  
  // Create enrollment
  const enrollment = await model.createEnrollment({
    student_id: student.id,
    course_id: data.course_id,
    registration_number: generateRegistrationNumber(),
    status: 'pending',
    experience_level: data.experience_level,
    time_preferences: data.time_preferences,
    preferred_days: data.preferred_days,
    idempotency_key: data.idempotency_key
  })
  
  // Publish event
  await publishEvent('enrollment.created', {
    enrollment_id: enrollment.id,
    student_id: student.id,
    course_id: data.course_id
  })
  
  return enrollment
}

// models/enrollment.model.ts
import { supabase } from '../config/supabase'

export async function createEnrollment(data: any) {
  const { data: enrollment, error } = await supabase
    .from('enrollments')
    .insert(data)
    .select()
    .single()
  
  if (error) throw new DatabaseError(error.message)
  return enrollment
}
```

---

## Testing Practices

### Unit Tests
```typescript
// tests/unit/enrollment.service.test.ts
import { describe, it, expect, vi } from 'vitest'
import * as enrollmentService from '../../src/services/enrollment.service'
import * as userModel from '../../src/models/user.model'
import * as enrollmentModel from '../../src/models/enrollment.model'

vi.mock('../../src/models/user.model')
vi.mock('../../src/models/enrollment.model')

describe('Enrollment Service', () => {
  describe('createEnrollment', () => {
    it('should create student and enrollment if user does not exist', async () => {
      const enrollmentData = {
        email: 'student@example.com',
        full_name: 'John Doe',
        wa_number: '+628123456789',
        course_id: 'course-uuid',
        experience_level: 'beginner',
        idempotency_key: 'idempotency-uuid'
      }
      
      vi.mocked(userModel.findByEmail).mockResolvedValue(null)
      vi.mocked(userModel.createStudent).mockResolvedValue({
        id: 'student-uuid',
        email: enrollmentData.email,
        full_name: enrollmentData.full_name,
        role: 'student'
      })
      vi.mocked(enrollmentModel.createEnrollment).mockResolvedValue({
        id: 'enrollment-uuid',
        student_id: 'student-uuid',
        status: 'pending'
      })
      
      const result = await enrollmentService.createEnrollment(enrollmentData)
      
      expect(result).toHaveProperty('id')
      expect(result.status).toBe('pending')
      expect(userModel.createStudent).toHaveBeenCalledWith(
        expect.objectContaining({
          email: enrollmentData.email,
          full_name: enrollmentData.full_name
        })
      )
    })
  })
})
```

### Integration Tests
```typescript
// tests/integration/enrollment.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { app } from '../../src/index'

describe('Enrollment API', () => {
  describe('POST /api/enrollments', () => {
    it('should create enrollment with valid data', async () => {
      const enrollmentData = {
        full_name: 'John Doe',
        email: 'john@example.com',
        wa_number: '+628123456789',
        course_id: 'valid-course-uuid',
        experience_level: 'beginner',
        time_preferences: 'Weekday evenings',
        preferred_days: ['monday', 'wednesday'],
        captcha_token: 'valid-captcha-token',
        idempotency_key: crypto.randomUUID()
      }
      
      const response = await app.request('/api/enrollments', {
        method: 'POST',
        body: JSON.stringify(enrollmentData),
        headers: { 'Content-Type': 'application/json' }
      })
      
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('id')
      expect(data.data.status).toBe('pending')
    })
    
    it('should reject duplicate submission with same idempotency key', async () => {
      const idempotencyKey = crypto.randomUUID()
      
      // First request
      await app.request('/api/enrollments', {
        method: 'POST',
        body: JSON.stringify({
          ...enrollmentData,
          idempotency_key: idempotencyKey
        }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      // Second request with same key
      const response = await app.request('/api/enrollments', {
        method: 'POST',
        body: JSON.stringify({
          ...enrollmentData,
          idempotency_key: idempotencyKey
        }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.code).toBe('DUPLICATE_SUBMISSION')
    })
  })
})
```
