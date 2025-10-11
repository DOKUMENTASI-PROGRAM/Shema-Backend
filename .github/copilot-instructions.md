# Shema Music Backend - AI Coding Instructions

## Project Overview
Backend system untuk website lembaga kursus musik "Shema Music". Sistem ini mentransformasi proses pendaftaran dan penjadwalan manual menjadi platform digital terintegrasi dengan AI recommendation system.

**Tech Stack**: Hono.js, Supabase (PostgreSQL), Redis, Docker  
**Development Phase**: Iterative development, starting with Auth Service  
**Timeline**: Oktober 2025 - Januari 2026 (14 minggu)

## Architecture Overview

### Microservices Architecture
Backend dibangun dengan arsitektur **microservices** - setiap service adalah aplikasi Hono.js independen yang berjalan di container Docker terpisah:

- **Auth Service** (Port 3001): Authentication & authorization (JWT-based)
- **User Service** (Port 3002): Manajemen data siswa, guru, dan admin
- **Course Service** (Port 3003): Manajemen kelas, paket, dan jadwal
- **Booking Service** (Port 3004): Sistem booking jadwal dengan 2 pilihan slot & konfirmasi 3 hari
- **Chat Service** (Port 3005): Real-time Live Chat dengan WebSocket
- **Recommendation Service** (Port 3006): AI-based class recommendation system
- **API Gateway** (Port 3000): Entry point untuk routing requests ke services

**Communication Pattern**:
- **Synchronous**: HTTP REST calls antar services menggunakan `fetch()`
- **Asynchronous**: Redis Pub/Sub untuk event-driven communication
- **Service Discovery**: Hardcoded URLs via environment variables (simple approach untuk development)

### Database Schema (Supabase)
Key tables:
- `users` - Profile pengguna (siswa, guru, admin)
- `courses` - Master data kelas dan instrumen
- `schedules` - Available slots untuk booking
- `bookings` - Data booking dengan status (pending/confirmed/rejected)
- `chat_sessions` & `chat_messages` - Live chat data
- `recommendations` - AI recommendation history

### Inter-Service Communication

#### Service-to-Service HTTP Calls
```typescript
// Example: Booking Service memanggil Course Service
const response = await fetch(`${process.env.COURSE_SERVICE_URL}/api/courses/${courseId}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${serviceToken}`, // Service-to-service JWT
    'X-Service-Name': 'booking-service'
  }
})

if (!response.ok) {
  throw new Error('COURSE_SERVICE_UNAVAILABLE')
}

const course = await response.json()
```

#### Event-Driven Communication (Redis Pub/Sub)
```typescript
// Publisher: User Service saat user baru register
await redis.publish('user.registered', JSON.stringify({
  eventType: 'USER_REGISTERED',
  userId: newUser.id,
  email: newUser.email,
  preferredInstruments: newUser.preferred_instruments,
  experienceLevel: newUser.experience_level,
  timestamp: new Date().toISOString()
}))

// Subscriber: Recommendation Service
redis.subscribe('user.registered')
redis.on('message', async (channel, message) => {
  if (channel === 'user.registered') {
    const event = JSON.parse(message)
    // Automatically generate recommendations for new user
    await generateRecommendations(event.userId)
  }
})
```

**Event Channels**:
- `user.registered` - User baru mendaftar
- `booking.created` - Booking baru dibuat
- `booking.confirmed` - Admin konfirmasi booking
- `booking.expired` - Booking expired setelah 3 hari
- `chat.message` - Real-time chat message

### Data Flow Architecture

#### 1. Registration & Onboarding Flow
```
User Browser → API Gateway → Auth Service → User Service → Supabase → 
Redis Event (user.registered) → Recommendation Service → Response
```

**Detailed Steps**:
1. User mengisi form pendaftaran (nama, email, passwordq, pengalaman musik, instrumen, dll)
2. Frontend POST ke **API Gateway** `/api/auth/register`
3. **API Gateway** route request ke **Auth Service** `http://auth-service:3001/register`
4. **Auth Service** validasi input (email unique, password strength)
5. **Auth Service** hash password dengan bcrypt
6. **Auth Service** call **User Service** `http://user-service:3002/api/users` untuk create user profile
7. **User Service** insert ke `users` table di Supabase dengan `role='student'`, `status='pending'`
8. **User Service** publish event ke Redis: `user.registered` dengan user data
9. **Auth Service** generate JWT access token (15 menit) & refresh token (7 hari)
10. **Auth Service** store refresh token di Redis: `refresh_token:{userId}` dengan TTL 7 hari
11. **Auth Service** return tokens + user profile ke API Gateway → Client
12. **Recommendation Service** (async) listen event `user.registered` dan auto-generate recommendations
13. Client redirect ke halaman rekomendasi kelas

**Key Database Operations**:
```typescript
// 1. Check existing user
const { data: existingUser } = await supabase
  .from('users')
  .select('id')
  .eq('email', email)
  .single()

// 2. Insert new user
const { data: newUser } = await supabase
  .from('users')
  .insert({
    email, 
    password_hash, 
    full_name,
    role: 'student',
    status: 'pending',
    experience_level,
    preferred_instruments: ['piano', 'gitar']
  })
  .select()
  .single()

// 3. Store refresh token in Redis
await redis.setex(`refresh_token:${newUser.id}`, 604800, refreshToken)
```

#### 2. Authentication Flow (Login)
```
User Browser → API Gateway → Auth Service → User Service → Supabase verify → 
Redis session → JWT Response
```

**Detailed Steps**:
1. User input email & password
2. Frontend POST ke **API Gateway** `/api/auth/login`
3. **API Gateway** forward ke **Auth Service** `http://auth-service:3001/login`
4. **Auth Service** call **User Service** `http://user-service:3002/api/users/by-email?email={email}`
5. **User Service** query `users` table by email dari Supabase
6. **Auth Service** compare password dengan bcrypt
7. Jika valid, **Auth Service** generate JWT tokens (access + refresh)
8. **Auth Service** store refresh token di Redis: `refresh_token:{userId}`
9. **Auth Service** call **User Service** untuk update `last_login_at`
10. **Auth Service** return tokens + user profile via API Gateway → Client

**Key Points**:
- Access token expired: 15 menit
- Refresh token expired: 7 hari
- Gunakan `/api/auth/refresh` untuk renew access token

#### 3. AI Recommendation Flow
```
User Profile Data → API Gateway → Recommendation Service → 
Course Service → Supabase (courses) → Ranked Results
```

**Detailed Steps**:
1. Collect user preferences dari registration atau form terpisah:
   - `experience_level`: beginner/intermediate/advanced
   - `learning_goal`: hobby/professional/exam_preparation
   - `preferred_instruments`: array of strings
   - `budget_range`: 'low' | 'medium' | 'high'
   - `available_days`: array of weekday strings
2. Frontend POST ke **API Gateway** `/api/recommendations/generate`
3. **API Gateway** route ke **Recommendation Service** `http://recommendation-service:3006/generate`
4. **Recommendation Service** call **User Service** untuk get user preferences
5. **Recommendation Service** call **Course Service** untuk get all available courses
6. **Recommendation Service** apply **Rule-Based Scoring Algorithm** (Phase 1):
   ```typescript
   score = 0
   // Match instrumen (weight: 40%)
   if (course.instrument in user.preferred_instruments) score += 40
   
   // Match experience level (weight: 30%)
   if (course.level === user.experience_level) score += 30
   
   // Match budget (weight: 20%)
   if (course.price_category === user.budget_range) score += 20
   
   // Availability overlap (weight: 10%)
   overlap = course.available_days ∩ user.available_days
   score += (overlap.length / course.available_days.length) * 10
   ```
7. **Recommendation Service** hitung score untuk setiap course
8. **Recommendation Service** sort by score descending, ambil top 5
9. **Recommendation Service** save recommendation history ke `recommendations` table (own DB)
10. **Recommendation Service** return ranked courses dengan confidence score via API Gateway → Client

**Database Schema**:
```sql
CREATE TABLE recommendations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  recommended_courses JSONB, -- array of {course_id, score, reason}
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. Booking Flow (Critical Business Logic)
```
User → API Gateway → Booking Service → Course Service → Supabase → 
Redis Event (booking.created) → 3-Day Timer → Admin Confirmation
```

**Detailed Steps**:
1. User browse available schedules dari **API Gateway** GET `/api/schedules/available?course_id={id}`
2. **API Gateway** route ke **Course Service** `http://course-service:3003/api/schedules/available`
3. **Course Service** query `schedules` table where `status='available'` AND `date > NOW()`
4. **Course Service** cache hasil di Redis (TTL: 5 menit): `schedules:available:{course_id}`
5. User memilih **2 slot berbeda** (first choice & second choice)
6. Frontend POST ke **API Gateway** `/api/bookings/create`:
   ```json
   {
     "course_id": "uuid",
     "first_choice_slot_id": "uuid",
     "second_choice_slot_id": "uuid"
   }
   ```
7. **API Gateway** route ke **Booking Service** `http://booking-service:3004/api/bookings/create`
8. **Booking Service** call **Course Service** untuk validate slots availability
9. **Booking Service** validation:
   - ✅ Both slots exist dan available
   - ✅ Both slots berbeda
   - ✅ Both slots untuk course yang sama
   - ✅ Both slots di masa depan
   - ✅ User belum punya booking pending untuk course ini
10. **Booking Service** insert ke `bookings` table (own DB):
   ```typescript
   {
     user_id,
     course_id,
     first_choice_slot_id,
     second_choice_slot_id,
     status: 'pending',
     created_at: NOW(),
     expires_at: NOW() + INTERVAL '3 days'
   }
   ```
11. **Booking Service** call **Course Service** untuk update `schedules` status: `available` → `reserved`
12. **Booking Service** publish event ke Redis: `booking.created` dengan booking details
13. **Background Job** di **Booking Service** (cron atau scheduled task):
   - Setiap 1 jam, query bookings where `status='pending'` AND `expires_at < NOW()`
   - Auto-reject expired bookings
   - Publish event `booking.expired` ke Redis
   - **Course Service** listen event `booking.expired` dan rollback: `reserved` → `available`
14. Admin review di dashboard (call **Booking Service** GET `/api/bookings/pending`)
15. Admin konfirmasi salah satu slot via **Booking Service** POST `/api/bookings/{id}/confirm`:
    - **Booking Service** update: `status='confirmed'`, `confirmed_slot_id`, `confirmed_at`
    - **Booking Service** call **Course Service** untuk update schedules:
      - Chosen slot: `reserved` → `booked`
      - Other slot: `reserved` → `available`
    - **Booking Service** publish event `booking.confirmed` ke Redis
16. **User Service** (atau Notification Service) listen event `booking.confirmed` dan send notification

**Key Database Operations**:
```typescript
// 1. Validate slots availability
const { data: slots } = await supabase
  .from('schedules')
  .select('*')
  .in('id', [firstChoiceSlotId, secondChoiceSlotId])
  .eq('status', 'available')

if (slots.length !== 2) throw new Error('BOOKING_INVALID_SLOTS')

// 2. Create booking with transaction
const { data: booking } = await supabase
  .from('bookings')
  .insert({
    user_id: userId,
    course_id: courseId,
    first_choice_slot_id: firstChoiceSlotId,
    second_choice_slot_id: secondChoiceSlotId,
    status: 'pending',
    expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  })
  .select()
  .single()

// 3. Reserve slots
await supabase
  .from('schedules')
  .update({ status: 'reserved' })
  .in('id', [firstChoiceSlotId, secondChoiceSlotId])
```

#### 5. Live Chat Flow (Real-time Communication)
```
User WebSocket ↔ API Gateway ↔ Chat Service ↔ Redis Pub/Sub ↔ Admin WebSocket
```

**Detailed Steps**:
1. User klik "Live Chat" button
2. Frontend establish WebSocket connection ke **API Gateway** `ws://api-gateway:3000/api/chat/connect`
3. **API Gateway** upgrade HTTP ke WebSocket dan forward ke **Chat Service** `ws://chat-service:3005/connect`
4. **Chat Service** authenticate user dari JWT token di query param atau header
5. **Chat Service** create or retrieve `chat_session`:
   ```typescript
   const { data: session } = await supabase
     .from('chat_sessions')
     .select('*')
     .eq('user_id', userId)
     .eq('status', 'active')
     .single()
   
   // If tidak ada, create new session
   if (!session) {
     const { data: newSession } = await supabase
       .from('chat_sessions')
       .insert({
         user_id: userId,
         status: 'active',
         started_at: new Date()
       })
       .select()
       .single()
   }
   ```
6. **Chat Service** subscribe ke Redis channel: `chat:session:{sessionId}`
7. User send message → WebSocket emit event
8. **Chat Service** handle message:
   ```typescript
   // Save to database
   await supabase.from('chat_messages').insert({
     session_id: sessionId,
     sender_id: userId,
     sender_role: 'student',
     message: messageContent,
     sent_at: new Date()
   })
   
   // Publish to Redis for real-time broadcast
   await redis.publish(`chat:session:${sessionId}`, JSON.stringify({
     type: 'new_message',
     data: { sender: 'student', message: messageContent, timestamp: new Date() }
   }))
   ```
9. Admin dashboard (separate WebSocket) subscribe to ALL active sessions via **Chat Service**: `chat:session:*`
10. Admin receives message via Redis Pub/Sub
11. Admin reply → same flow reversed (admin WebSocket → **Chat Service** → Redis → user WebSocket)
12. User disconnect → **Chat Service** update session `last_activity_at`
13. **Chat Service** auto-close session after 30 menit idle

**Redis Pub/Sub Pattern**:
```typescript
// Publisher (saat ada message baru)
await redis.publish(`chat:session:${sessionId}`, JSON.stringify({
  type: 'new_message',
  sender_role: 'student',
  sender_name: 'John Doe',
  message: 'Halo, saya mau tanya tentang kelas piano',
  timestamp: new Date().toISOString()
}))

// Subscriber (di admin dashboard)
const subscriber = redis.duplicate()
await subscriber.subscribe('chat:session:*')

subscriber.on('message', (channel, message) => {
  const sessionId = channel.split(':')[2]
  const data = JSON.parse(message)
  
  // Emit to admin WebSocket clients
  adminSockets[sessionId]?.emit('new_message', data)
})
```

#### 6. Admin Dashboard Data Flow
```
Admin Login → API Gateway → Auth Service → 
Multiple Services (parallel calls) → Aggregated Response
```

**Key Queries** (API Gateway calls multiple services in parallel):
```typescript
// 1. Pending bookings (butuh konfirmasi)
const { data: pendingBookings } = await supabase
  .from('bookings')
  .select(`
    *,
    users(full_name, email),
    courses(name, instrument),
    schedules!first_choice_slot_id(date, time),
    schedules!second_choice_slot_id(date, time)
  `)
  .eq('status', 'pending')
  .lt('expires_at', new Date())
  .order('created_at', { ascending: true })

// 2. Active chat sessions
const { data: activeSessions } = await supabase
  .from('chat_sessions')
  .select(`
    *,
    users(full_name, email),
    chat_messages(count)
  `)
  .eq('status', 'active')
  .order('last_activity_at', { ascending: false })

// 3. Statistics untuk dashboard (API Gateway aggregates dari multiple services)
const [userStats, bookingStats, chatStats, courseStats] = await Promise.all([
  fetch(`${USER_SERVICE_URL}/api/users/stats`),      // total_students
  fetch(`${BOOKING_SERVICE_URL}/api/bookings/stats`), // pending_bookings
  fetch(`${CHAT_SERVICE_URL}/api/chat/stats`),        // active_chats
  fetch(`${COURSE_SERVICE_URL}/api/courses/stats`)    // courses_available
])

const stats = {
  total_students: (await userStats.json()).count,
  pending_bookings: (await bookingStats.json()).count,
  active_chats: (await chatStats.json()).count,
  courses_available: (await courseStats.json()).count
}
```

**API Gateway Pattern untuk Aggregation**:
```typescript
// API Gateway endpoint: GET /api/admin/dashboard
app.get('/api/admin/dashboard', requireRole(['admin']), async (c) => {
  // Parallel calls ke multiple microservices
  const [pendingBookings, activeSessions, stats] = await Promise.all([
    fetchFromService('booking-service', '/api/bookings/pending'),
    fetchFromService('chat-service', '/api/chat/active-sessions'),
    fetchDashboardStats() // calls multiple services
  ])
  
  return c.json({
    pendingBookings,
    activeSessions,
    stats
  })
})
```

## Development Guidelines

### 1. Authentication Pattern (Auth Service - Phase 1)
```typescript
// Standard auth middleware pattern untuk semua protected routes
import { Hono } from 'hono'
import { jwt } from 'hono/jwt'

const app = new Hono()

// Gunakan JWT middleware untuk protected routes
app.use('/api/protected/*', jwt({ 
  secret: process.env.JWT_SECRET 
}))

// Role-based access control
const requireRole = (roles: string[]) => async (c, next) => {
  const payload = c.get('jwtPayload')
  if (!roles.includes(payload.role)) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  await next()
}
```

**Key Points**:
- Gunakan Supabase Auth untuk provider authentication
- JWT tokens untuk session management
- Roles: `student`, `teacher`, `admin`
- Refresh token strategy dengan Redis storage

### 2. Supabase Integration Pattern
```typescript
import { createClient } from '@supabase/supabase-js'

// Initialize di setiap service yang membutuhkan
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Query pattern dengan error handling
try {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'student')
  
  if (error) throw error
  return c.json({ data })
} catch (error) {
  return c.json({ error: error.message }, 500)
}
```

### 3. Redis Usage Patterns
**Session Storage**:
```typescript
// Simpan refresh tokens di Redis dengan TTL
await redis.setex(`refresh_token:${userId}`, 7 * 24 * 60 * 60, token)
```

**Live Chat Pub/Sub**:
```typescript
// Publisher (dari user message)
await redis.publish('chat:room:123', JSON.stringify(message))

// Subscriber (di admin dashboard)
redis.subscribe('chat:room:*')
```

**Caching Strategy**:
- Cache available schedules (TTL: 5 minutes)
- Cache course catalog (TTL: 1 hour)
- Invalidate cache saat admin update data

### 4. Booking System Logic (Critical Business Rule)
```typescript
// User HARUS memilih 2 slot jadwal berbeda
// Admin punya 3 hari untuk konfirmasi
// Setelah 3 hari tanpa konfirmasi = auto-reject

interface BookingRequest {
  userId: string
  courseId: string
  firstChoiceSlot: string  // ISO datetime
  secondChoiceSlot: string // ISO datetime
}

// Validation rules:
// 1. Both slots harus available
// 2. Both slots tidak boleh sama
// 3. Both slots harus di masa depan
// 4. Set expired_at = created_at + 3 days
```

### 5. AI Recommendation System
Input factors untuk rekomendasi kelas:
- Pengalaman musik (pemula/intermediate/advanced)
- Tujuan belajar (hobi/profesional)
- Instrumen yang diminati
- Budget range
- Ketersediaan waktu

Output: Ranked list of recommended courses dengan confidence score

**Implementation Note**: Bisa dimulai dengan rule-based system, kemudian enhanced dengan ML model

### 6. Error Handling Convention
```typescript
// Standard error response format
{
  "error": "Error message for client",
  "code": "ERROR_CODE",
  "details": { /* optional additional info */ }
}

// Error codes pattern:
// AUTH_* untuk authentication errors
// VALIDATION_* untuk input validation errors
// BOOKING_* untuk booking-related errors
// DB_* untuk database errors
```

### 7. Environment Variables (Per Service)

**API Gateway** (Port 3000):
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=

# Service URLs
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3002
COURSE_SERVICE_URL=http://course-service:3003
BOOKING_SERVICE_URL=http://booking-service:3004
CHAT_SERVICE_URL=http://chat-service:3005
RECOMMENDATION_SERVICE_URL=http://recommendation-service:3006
```

**Auth Service** (Port 3001):
```env
PORT=3001
JWT_SECRET=
JWT_REFRESH_SECRET=
REDIS_URL=redis://redis:6379
USER_SERVICE_URL=http://user-service:3002

# Service-to-service token
SERVICE_JWT_SECRET=
```

**User Service** (Port 3002):
```env
PORT=3002
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=redis://redis:6379
SERVICE_JWT_SECRET=
```

**Course Service** (Port 3003):
```env
PORT=3003
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=redis://redis:6379
SERVICE_JWT_SECRET=
```

**Booking Service** (Port 3004):
```env
PORT=3004
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=redis://redis:6379
COURSE_SERVICE_URL=http://course-service:3003
SERVICE_JWT_SECRET=
```

**Chat Service** (Port 3005):
```env
PORT=3005
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=redis://redis:6379
SERVICE_JWT_SECRET=
```

**Recommendation Service** (Port 3006):
```env
PORT=3006
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=redis://redis:6379
USER_SERVICE_URL=http://user-service:3002
COURSE_SERVICE_URL=http://course-service:3003
SERVICE_JWT_SECRET=

# AI Service (optional, for future)
AI_MODEL_ENDPOINT=
```

## Development Workflow

### Phase 1: Auth Service (Current)
- [ ] Setup Hono project structure
- [ ] Implement register/login/logout endpoints
- [ ] JWT token generation & validation
- [ ] Refresh token mechanism dengan Redis
- [ ] Role-based middleware
- [ ] Supabase users table integration

### Phase 2-6: Other Services (Sequential)
Each service follows the same pattern:
1. Define routes di `/src/routes/{service}.ts`
2. Implement controllers di `/src/controllers/{service}.ts`
3. Database operations di `/src/models/{service}.ts`
4. Add middleware untuk auth & validation
5. Write integration tests

### Docker Deployment

**Docker Compose** (untuk local development):
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  api-gateway:
    build: ./api-gateway
    ports:
      - "3000:3000"
    environment:
      - AUTH_SERVICE_URL=http://auth-service:3001
      - USER_SERVICE_URL=http://user-service:3002
      - COURSE_SERVICE_URL=http://course-service:3003
      - BOOKING_SERVICE_URL=http://booking-service:3004
      - CHAT_SERVICE_URL=http://chat-service:3005
      - RECOMMENDATION_SERVICE_URL=http://recommendation-service:3006
    depends_on:
      - auth-service
      - user-service
      - course-service
      - booking-service
      - chat-service
      - recommendation-service

  auth-service:
    build: ./services/auth
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - REDIS_URL=redis://redis:6379
      - USER_SERVICE_URL=http://user-service:3002
    env_file:
      - ./services/auth/.env
    depends_on:
      - redis

  user-service:
    build: ./services/user
    ports:
      - "3002:3002"
    environment:
      - PORT=3002
      - REDIS_URL=redis://redis:6379
    env_file:
      - ./services/user/.env
    depends_on:
      - redis

  course-service:
    build: ./services/course
    ports:
      - "3003:3003"
    environment:
      - PORT=3003
      - REDIS_URL=redis://redis:6379
    env_file:
      - ./services/course/.env
    depends_on:
      - redis

  booking-service:
    build: ./services/booking
    ports:
      - "3004:3004"
    environment:
      - PORT=3004
      - REDIS_URL=redis://redis:6379
      - COURSE_SERVICE_URL=http://course-service:3003
    env_file:
      - ./services/booking/.env
    depends_on:
      - redis
      - course-service

  chat-service:
    build: ./services/chat
    ports:
      - "3005:3005"
    environment:
      - PORT=3005
      - REDIS_URL=redis://redis:6379
    env_file:
      - ./services/chat/.env
    depends_on:
      - redis

  recommendation-service:
    build: ./services/recommendation
    ports:
      - "3006:3006"
    environment:
      - PORT=3006
      - REDIS_URL=redis://redis:6379
      - USER_SERVICE_URL=http://user-service:3002
      - COURSE_SERVICE_URL=http://course-service:3003
    env_file:
      - ./services/recommendation/.env
    depends_on:
      - redis
      - user-service
      - course-service

volumes:
  redis-data:
```

**Standard Dockerfile** (untuk setiap microservice):
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

**Project Structure**:
```
backend/
├── services/
│   ├── api-gateway/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   └── middleware/
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── auth/
│   │   ├── src/
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── user/
│   ├── course/
│   ├── booking/
│   ├── chat/
│   └── recommendation/
├── docker-compose.yml
└── README.md
```

## Testing Strategy
- Unit tests untuk business logic (booking validation, recommendation algorithm)
- Integration tests untuk API endpoints
- Load testing untuk Live Chat WebSocket connections
- Manual testing untuk 3-day booking confirmation flow

## Project Constraints & Business Rules
1. **NO payment gateway integration** (out of scope)
2. **NO automatic schedule conflict detection** (manual admin review)
3. **NO mobile app** (web-only)
4. **NO AI chatbot** (Live Chat is human-to-human only)
5. **Booking confirmation window**: Exactly 3 days, no exceptions
6. **Two slot selection**: Mandatory for all bookings

## Key Files to Reference
- `/services/api-gateway/src/index.ts` - API Gateway entry point & routing logic
- `/services/api-gateway/src/utils/aggregator.ts` - Service aggregation patterns
- `/services/auth/src/index.ts` - Auth service with JWT handling
- `/services/{service}/src/routes/*.ts` - Service-specific endpoints
- `/services/{service}/src/events/publisher.ts` - Redis event publishers
- `/services/{service}/src/events/subscriber.ts` - Redis event subscribers
- `/shared/middleware/auth.ts` - Shared JWT validation middleware
- `/shared/config/supabase.ts` - Shared Supabase client setup
- `/shared/config/redis.ts` - Shared Redis client & pub/sub helpers
- `/docker-compose.yml` - Orchestration untuk semua microservices

## Common Pitfalls to Avoid
- ❌ Jangan hardcode service URLs, gunakan environment variables
- ❌ Jangan hardcode role strings, gunakan enum/constants
- ❌ Jangan lupa validate bahwa 2 slot booking berbeda
- ❌ Jangan lupa set TTL di Redis untuk semua cached data
- ❌ Jangan expose Supabase service role key di client
- ❌ Jangan implement payment gateway (explicitly out of scope)
- ❌ Jangan lupa handle service unavailability dengan retry logic atau circuit breaker
- ❌ Jangan buat circular dependencies antar services
- ❌ Jangan share database antar services (setiap service punya table sendiri atau shared DB dengan boundary jelas)

## Questions to Ask Before Implementing
- Apakah fitur ini memerlukan authentication? Role apa yang boleh akses?
- Service mana yang harus handle logic ini?
- Apakah perlu komunikasi dengan service lain? (HTTP call atau Redis event?)
- Apakah data ini perlu di-cache di Redis?
- Bagaimana error handling jika service lain unavailable?
- Apakah perubahan ini affect booking confirmation flow?
- Apakah perlu publish event ke Redis untuk service lain?
- Apakah bisa terjadi race condition atau data inconsistency antar services?
