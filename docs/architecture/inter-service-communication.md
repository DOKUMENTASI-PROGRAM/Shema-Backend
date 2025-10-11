# Inter-Service Communication

⚠️ **IMPORTANT**: Authentication model update - Firebase Auth untuk **admin ONLY**. Students/instructors tidak memiliki authentication.

Dokumen ini menjelaskan pattern dan best practices untuk komunikasi antar microservices dalam sistem Shema Music.

## Communication Types

### 1. Synchronous Communication (HTTP REST)
### 2. Asynchronous Communication (Redis Pub/Sub)
### 3. Service Discovery

---

## 1. Synchronous Communication (HTTP REST)

### When to Use
- Ketika membutuhkan immediate response
- Data validation yang memerlukan result dari service lain
- CRUD operations yang dependent pada service lain
- Query aggregation dari multiple services

### Implementation Pattern

#### Basic HTTP Call
```typescript
async function callService(serviceUrl: string, endpoint: string, options = {}) {
  const response = await fetch(`${serviceUrl}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${generateServiceToken()}`,
      'X-Service-Name': process.env.SERVICE_NAME,
      'X-Request-ID': generateRequestId(),
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  })

  if (!response.ok) {
    throw new ServiceUnavailableError(
      `${serviceUrl} returned ${response.status}`
    )
  }

  return await response.json()
}
```

#### With Retry Logic
```typescript
async function callServiceWithRetry(
  serviceUrl: string, 
  endpoint: string, 
  options = {},
  maxRetries = 3
) {
  let lastError
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callService(serviceUrl, endpoint, options)
    } catch (error) {
      lastError = error
      
      // Don't retry on 4xx errors (client errors)
      if (error.status >= 400 && error.status < 500) {
        throw error
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 100
      await sleep(delay)
      
      console.warn(`Retry attempt ${attempt}/${maxRetries} for ${serviceUrl}${endpoint}`)
    }
  }
  
  throw new ServiceUnavailableError(
    `Failed after ${maxRetries} retries: ${lastError.message}`
  )
}
```

#### With Circuit Breaker
```typescript
class CircuitBreaker {
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {
    this.failureCount = 0
    this.state = 'CLOSED' // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now()
  }

  async call(fn: Function) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN')
      }
      this.state = 'HALF_OPEN'
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failureCount = 0
    this.state = 'CLOSED'
  }

  private onFailure() {
    this.failureCount++
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN'
      this.nextAttempt = Date.now() + this.timeout
    }
  }
}

// Usage
const courseServiceBreaker = new CircuitBreaker(5, 60000)

async function getCourse(courseId: string) {
  return await courseServiceBreaker.call(async () => {
    return await callService(
      process.env.COURSE_SERVICE_URL,
      `/api/courses/${courseId}`
    )
  })
}
```

### Service-to-Service Authentication

#### Generate Service Token
```typescript
import jwt from 'jsonwebtoken'

function generateServiceToken() {
  return jwt.sign(
    {
      service: process.env.SERVICE_NAME,
      scope: 'internal',
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.SERVICE_JWT_SECRET,
    { expiresIn: '5m' }
  )
}
```

#### Validate Service Token
```typescript
import { Hono } from 'hono'
import { jwt } from 'hono/jwt'

const app = new Hono()

// Middleware untuk validate service token
const validateServiceToken = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return c.json({ error: 'Service token required' }, 401)
  }

  try {
    const payload = jwt.verify(token, process.env.SERVICE_JWT_SECRET)
    
    if (payload.scope !== 'internal') {
      return c.json({ error: 'Invalid token scope' }, 403)
    }

    c.set('servicePayload', payload)
    await next()
  } catch (error) {
    return c.json({ error: 'Invalid service token' }, 401)
  }
}

// Protected internal endpoint
app.post('/internal/users', validateServiceToken, async (c) => {
  const callingService = c.get('servicePayload').service
  console.log(`Request from ${callingService}`)
  // Handle request
})
```

### Real-World Examples

#### Example 1: Enrollment Service → Course Service
```typescript
// enrollment-service/src/services/course-validation.ts
export async function validateCourseCapacity(courseId: string) {
  try {
    const response = await fetch(
      `${process.env.COURSE_SERVICE_URL}/api/courses/${courseId}/capacity`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${generateServiceToken()}`,
          'X-Service-Name': 'enrollment-service'
        }
      }
    )

    if (!response.ok) {
      throw new Error('COURSE_SERVICE_UNAVAILABLE')
    }

    const { has_capacity, current_students, max_students } = await response.json()
    
    if (!has_capacity) {
      throw new Error('COURSE_FULL')
    }

    return { current_students, max_students }
  } catch (error) {
    console.error('Failed to validate course capacity:', error)
    throw error
  }
}
```

#### Example 2: Auth Service → User Service
```typescript
// auth-service/src/services/user-lookup.ts
export async function getUserByEmail(email: string) {
  const cacheKey = `user:email:${email}`
  
  // Check cache first
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }

  // Call User Service
  const response = await fetch(
    `${process.env.USER_SERVICE_URL}/api/users/by-email?email=${encodeURIComponent(email)}`,
    {
      headers: {
        'Authorization': `Bearer ${generateServiceToken()}`,
        'X-Service-Name': 'auth-service'
      }
    }
  )

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error('USER_SERVICE_UNAVAILABLE')
  }

  const user = await response.json()
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(user))
  
  return user
}
```

#### Example 3: API Gateway Aggregation
```typescript
// api-gateway/src/controllers/dashboard.ts
export async function getAdminDashboard(c) {
  try {
    // Parallel calls ke multiple services
    const [usersStats, enrollmentsStats, chatsStats, coursesStats, schedulesStats] = await Promise.all([
      fetch(`${USER_SERVICE_URL}/api/users/stats`, {
        headers: { 'Authorization': `Bearer ${generateServiceToken()}` }
      }).then(r => r.json()),
      
      fetch(`${ENROLLMENT_SERVICE_URL}/api/enrollments/stats`, {
        headers: { 'Authorization': `Bearer ${generateServiceToken()}` }
      }).then(r => r.json()),
      
      fetch(`${CHAT_SERVICE_URL}/api/chat/stats`, {
        headers: { 'Authorization': `Bearer ${generateServiceToken()}` }
      }).then(r => r.json()),
      
      fetch(`${COURSE_SERVICE_URL}/api/courses/stats`, {
        headers: { 'Authorization': `Bearer ${generateServiceToken()}` }
      }).then(r => r.json()),
      
      fetch(`${SCHEDULE_SERVICE_URL}/api/schedules/stats`, {
        headers: { 'Authorization': `Bearer ${generateServiceToken()}` }
      }).then(r => r.json())
    ])

    return c.json({
      stats: {
        total_students: usersStats.student_count,
        pending_enrollments: enrollmentsStats.pending_count,
        active_chats: chatsStats.active_count,
        total_courses: coursesStats.count,
        upcoming_classes: schedulesStats.upcoming_count
      },
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Dashboard aggregation failed:', error)
    return c.json({ error: 'Failed to fetch dashboard data' }, 500)
  }
}
```

---

## 2. Asynchronous Communication (Redis Pub/Sub)

### When to Use
- Event notification yang tidak memerlukan immediate response
- Decoupling services untuk better resilience
- Broadcasting messages ke multiple subscribers
- Long-running processes yang asynchronous

### Event Naming Convention
Format: `{domain}.{action}`

**Examples**:
- `enrollment.created` - Enrollment baru dibuat (student mendaftar)
- `enrollment.approved` - Admin approve enrollment
- `enrollment.rejected` - Admin reject enrollment
- `schedule.created` - Class schedule baru dibuat
- `attendance.marked` - Attendance student ditandai
- `chat.message` - Real-time chat message
- `chat.session.closed` - Chat session ditutup
- `user.updated` - User profile diupdate (admin edit)

### Implementation Pattern

#### Publisher
```typescript
// services/enrollment/src/events/publisher.ts
import { createClient } from 'redis'

const redis = createClient({ url: process.env.REDIS_URL })
await redis.connect()

export async function publishEnrollmentCreated(enrollment: Enrollment) {
  const event = {
    eventType: 'ENROLLMENT_CREATED',
    eventId: generateEventId(),
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: {
      enrollmentId: enrollment.id,
      studentId: enrollment.student_id,
      courseId: enrollment.course_id,
      registrationNumber: enrollment.registration_number,
      experienceLevel: enrollment.experience_level,
      preferredDays: enrollment.preferred_days,
      timePreferences: enrollment.time_preferences
    }
  }

  try {
    await redis.publish('enrollment.created', JSON.stringify(event))
    console.log(`Published event: enrollment.created for enrollment ${enrollment.id}`)
  } catch (error) {
    console.error('Failed to publish event:', error)
    // Don't throw - event publishing failure should not break main flow
  }
}

export async function publishEnrollmentApproved(enrollmentId: string, studentId: string) {
  const event = {
    eventType: 'ENROLLMENT_APPROVED',
    eventId: generateEventId(),
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: { enrollmentId, studentId }
  }

  try {
    await redis.publish('enrollment.approved', JSON.stringify(event))
    console.log(`Published event: enrollment.approved for ${enrollmentId}`)
  } catch (error) {
    console.error('Failed to publish event:', error)
  }
}
```

#### Subscriber
```typescript
// services/schedule/src/events/subscriber.ts
import { createClient } from 'redis'

const subscriber = createClient({ url: process.env.REDIS_URL })
await subscriber.connect()

export async function subscribeToEnrollmentEvents() {
  // Listen to enrollment approved events
  await subscriber.subscribe('enrollment.approved', async (message) => {
    try {
      const event = JSON.parse(message)
      
      console.log(`Received event: ${event.eventType} for enrollment ${event.data.enrollmentId}`)
      
      // Process event: Notify admin to create class schedule
      await handleEnrollmentApproved(event.data)
    } catch (error) {
      console.error('Failed to process enrollment.approved event:', error)
      // Log to error tracking service
    }
  })

  console.log('Subscribed to enrollment.approved events')
}

async function handleEnrollmentApproved(data: { enrollmentId: string; studentId: string }) {
  // Send notification to admin dashboard
  // Trigger WhatsApp notification to student
  console.log(`Enrollment ${data.enrollmentId} approved, notify admin to schedule class`)
}
```

#### Pattern-Based Subscription
```typescript
// Subscribe to all enrollment events
await subscriber.pSubscribe('enrollment.*', (message, channel) => {
  const event = JSON.parse(message)
  
  switch (channel) {
    case 'booking.created':
      handleBookingCreated(event)
      break
    case 'booking.confirmed':
      handleBookingConfirmed(event)
      break
    case 'booking.expired':
      handleBookingExpired(event)
      break
    default:
      console.warn(`Unknown booking event: ${channel}`)
  }
})
```

### Real-World Examples

#### Example 1: Booking Lifecycle Events
```typescript
// services/booking/src/events/publisher.ts

export async function publishBookingCreated(booking) {
  await redis.publish('booking.created', JSON.stringify({
    eventType: 'BOOKING_CREATED',
    eventId: generateEventId(),
    timestamp: new Date().toISOString(),
    data: {
      bookingId: booking.id,
      userId: booking.user_id,
      courseId: booking.course_id,
      firstChoiceSlotId: booking.first_choice_slot_id,
      secondChoiceSlotId: booking.second_choice_slot_id,
      expiresAt: booking.expires_at
    }
  }))
}

export async function publishBookingExpired(booking) {
  await redis.publish('booking.expired', JSON.stringify({
    eventType: 'BOOKING_EXPIRED',
    eventId: generateEventId(),
    timestamp: new Date().toISOString(),
    data: {
      bookingId: booking.id,
      firstChoiceSlotId: booking.first_choice_slot_id,
      secondChoiceSlotId: booking.second_choice_slot_id
    }
  }))
}

// services/course/src/events/subscriber.ts
await subscriber.subscribe('booking.expired', async (message) => {
  const event = JSON.parse(message)
  
  // Rollback reserved slots to available
  await supabase
    .from('schedules')
    .update({ status: 'available' })
    .in('id', [
      event.data.firstChoiceSlotId,
      event.data.secondChoiceSlotId
    ])
  
  console.log(`Rolled back slots for expired booking ${event.data.bookingId}`)
})
```

#### Example 2: Live Chat Messages
```typescript
// services/chat/src/events/chat-pubsub.ts

export async function publishChatMessage(sessionId: string, message) {
  await redis.publish(`chat:session:${sessionId}`, JSON.stringify({
    type: 'new_message',
    sessionId,
    senderId: message.sender_id,
    senderRole: message.sender_role,
    senderName: message.sender_name,
    message: message.message,
    timestamp: message.sent_at
  }))
}

// Admin dashboard subscribes to all chat sessions
await subscriber.pSubscribe('chat:session:*', (message, channel) => {
  const sessionId = channel.split(':')[2]
  const data = JSON.parse(message)
  
  // Emit to admin WebSocket clients
  adminWebSocketClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'chat_message',
        sessionId,
        ...data
      }))
    }
  })
})
```

### Event Versioning
```typescript
interface Event {
  eventType: string
  eventId: string
  version: string // "1.0", "1.1", etc.
  timestamp: string
  data: any
}

// Handle multiple versions
async function handleEvent(message: string) {
  const event: Event = JSON.parse(message)
  
  switch (event.version) {
    case '1.0':
      await handleV1Event(event)
      break
    case '1.1':
      await handleV1_1Event(event)
      break
    default:
      console.warn(`Unsupported event version: ${event.version}`)
  }
}
```

### Error Handling & Dead Letter Queue
```typescript
async function processEventWithRetry(event, handler, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await handler(event)
      return
    } catch (error) {
      console.error(`Failed to process event (attempt ${attempt}/${maxRetries}):`, error)
      
      if (attempt === maxRetries) {
        // Send to dead letter queue
        await redis.lPush('events:dead_letter', JSON.stringify({
          event,
          error: error.message,
          failedAt: new Date().toISOString()
        }))
      }
      
      await sleep(Math.pow(2, attempt) * 1000)
    }
  }
}
```

---

## 3. Service Discovery

### Current Approach: Environment Variables
```env
# API Gateway
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3002
COURSE_SERVICE_URL=http://course-service:3003
BOOKING_SERVICE_URL=http://booking-service:3004
CHAT_SERVICE_URL=http://chat-service:3005
RECOMMENDATION_SERVICE_URL=http://recommendation-service:3006
```

### Service Registry Pattern (Future)
```typescript
// shared/service-registry.ts
class ServiceRegistry {
  private services = new Map<string, ServiceInfo>()

  register(name: string, url: string, healthCheck: string) {
    this.services.set(name, { url, healthCheck, lastCheck: Date.now() })
  }

  async getService(name: string): Promise<string> {
    const service = this.services.get(name)
    if (!service) throw new Error(`Service ${name} not found`)
    
    // Health check
    if (Date.now() - service.lastCheck > 30000) {
      const healthy = await this.checkHealth(service)
      if (!healthy) throw new Error(`Service ${name} is unhealthy`)
    }
    
    return service.url
  }

  private async checkHealth(service: ServiceInfo): Promise<boolean> {
    try {
      const response = await fetch(`${service.url}${service.healthCheck}`)
      service.lastCheck = Date.now()
      return response.ok
    } catch {
      return false
    }
  }
}
```

### Load Balancing (Future Enhancement)
```typescript
class LoadBalancer {
  private instances: string[] = []
  private currentIndex = 0

  constructor(serviceInstances: string[]) {
    this.instances = serviceInstances
  }

  getNext(): string {
    const instance = this.instances[this.currentIndex]
    this.currentIndex = (this.currentIndex + 1) % this.instances.length
    return instance
  }
}

// Usage
const courseServiceLB = new LoadBalancer([
  'http://course-service-1:3003',
  'http://course-service-2:3003',
  'http://course-service-3:3003'
])

const serviceUrl = courseServiceLB.getNext()
await fetch(`${serviceUrl}/api/courses`)
```

## Best Practices

### 1. Timeout Configuration
```typescript
const TIMEOUT_CONFIG = {
  default: 5000,      // 5 seconds
  database: 10000,    // 10 seconds
  external: 15000,    // 15 seconds
  longRunning: 30000  // 30 seconds
}

async function fetchWithTimeout(url, options, timeout = TIMEOUT_CONFIG.default) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}
```

### 2. Request ID Tracing
```typescript
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Add to all requests
headers: {
  'X-Request-ID': c.req.header('X-Request-ID') || generateRequestId()
}
```

### 3. Logging
```typescript
async function logServiceCall(serviceName, endpoint, duration, status) {
  console.log(JSON.stringify({
    type: 'service_call',
    service: serviceName,
    endpoint,
    duration_ms: duration,
    status,
    timestamp: new Date().toISOString()
  }))
}
```

### 4. Graceful Degradation
```typescript
async function getCourseWithFallback(courseId: string) {
  try {
    return await getCourse(courseId)
  } catch (error) {
    console.error('Course service unavailable, using cached data')
    return await getCachedCourse(courseId)
  }
}
```
