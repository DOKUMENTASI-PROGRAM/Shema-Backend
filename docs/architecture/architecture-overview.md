# Architecture Overview

## Pengantar

Backend Shema Music dibangun dengan **arsitektur microservices** dimana setiap service adalah aplikasi Hono.js independen yang berjalan di container Docker terpisah. Arsitektur ini dipilih untuk memberikan skalabilitas, resiliensi, dan kemudahan maintenance.

**⚠️ IMPORTANT**: Authentication model menggunakan **hybrid approach**:
- **Admin**: Firebase Authentication (untuk fitur forgot password)
- **Students & Instructors**: NO authentication (pasif, managed by admin)

## Tech Stack

- **Framework**: Hono.js (lightweight & fast web framework)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Firebase Auth (admin-only)
- **Caching & Pub/Sub**: Redis
- **Deployment**: Docker & Docker Compose
- **Language**: TypeScript

## Microservices Structure

### 1. API Gateway (Port 3000)
**Responsibility**: Entry point untuk semua client requests

**Fungsi Utama**:
- Routing requests ke service yang sesuai
- Authentication validation (JWT verification)
- Request/response transformation
- Service aggregation untuk dashboard data
- Rate limiting (optional)
- CORS handling

**Endpoints**:
- `/api/auth/*` → Auth Service
- `/api/users/*` → User Service
- `/api/courses/*` → Course Service
- `/api/bookings/*` → Booking Service
- `/api/chat/*` → Chat Service
- `/api/recommendations/*` → Recommendation Service

### 2. Auth Service (Port 3001)
**Responsibility**: Admin authentication ONLY (Firebase-based)

**Fungsi Utama**:
- **Admin login** via Firebase ID token verification
- Firebase Admin SDK integration
- Token validation for admin endpoints
- Role-based access control (admin-only)
- Forgot password (delegated to Firebase)

**Dependencies**:
- Firebase Admin SDK (untuk verify ID tokens)
- User Service (untuk get admin profile)

**Important Notes**:
- ❌ NO student/instructor registration endpoints
- ❌ NO password hashing (Firebase handles it)
- ✅ Admin-only authentication system
- ✅ Forgot password automatic via Firebase

### 3. User Service (Port 3002)
**Responsibility**: User profile & data management (admin, students, instructors)

**Fungsi Utama**:
- CRUD operations untuk user profiles
- **Auto-create student users** dari enrollment form
- Admin-only: Create/update instructors
- User role management (student, instructor, admin)
- Public endpoint: Check enrollment status by email/registration number
- User statistics untuk dashboard

**Database Tables**:
- `users` - Main user profile data (firebase_uid NULL untuk non-admin)

**Important Notes**:
- ✅ Students created automatically from public enrollment form
- ✅ Instructors created by admin via dashboard
- ✅ Only admins have firebase_uid (non-NULL)
- ❌ NO student/instructor registration endpoints

### 4. Course Service (Port 3003)
**Responsibility**: Course catalog & schedule management

**Fungsi Utama**:
- **Public**: Browse courses & schedules (no auth required)
- **Admin**: CRUD operations untuk courses
- **Admin**: Schedule/class management
- Course filtering & search
- Cache management untuk available schedules

**Database Tables**:
- `courses` - Master data kelas dan instrumen
- `class_schedules` - Scheduled classes (instructor + room + time)
- `rooms` - Practice/class rooms

**Important Notes**:
- ✅ Public endpoints untuk course browsing
- ✅ Admin endpoints untuk course management
- ✅ Anti-overlap constraint untuk room & instructor schedules

### 5. Enrollment Service (Port 3004)
**Responsibility**: Student enrollment & registration management

**Fungsi Utama**:
- **Public**: Submit enrollment form (no auth required)
- Auto-create student user dari form data
- Validate captcha & idempotency keys
- Store enrollment preferences (time, days, guardian info)
- **Admin**: Approve/reject enrollments
- Enrollment status management (pending/active/completed/cancelled)
- Send notification emails

**Database Tables**:
- `enrollments` - Enrollment records dengan preferences

**Critical Business Rules**:
- ✅ Public endpoint (no authentication)
- ✅ Captcha validation required
- ✅ Idempotency key prevents duplicate submissions
- ✅ Consent required
- ✅ Auto-create user with firebase_uid=NULL
- ✅ Admin reviews & approves via dashboard

### 6. Chat Service (Port 3005)
**Responsibility**: Real-time live chat communication

**Fungsi Utama**:
- **Public**: WebSocket connection (no auth required for guests)
- Chat session creation & management
- Message persistence ke database
- Real-time message broadcasting via Redis Pub/Sub
- Auto-close inactive sessions (30 menit)
- **Admin**: View & respond to chat sessions

**Database Tables**:
- `chat_sessions` - Chat session metadata (user_id optional for guests)
- `chat_messages` - Message history

**Important Notes**:
- ✅ Public chat access (students can chat without login)
- ✅ Admin dashboard shows all active sessions
- ✅ Real-time communication via Redis Pub/Sub

### 7. Schedule & Attendance Service (Port 3006)
**Responsibility**: Class schedule attendance tracking

**Fungsi Utama**:
- **Admin**: Assign students to class schedules
- **Admin**: Mark attendance (present/absent)
- **Admin**: View attendance reports
- Attendance statistics per student/course
- Enforce capacity limits per class

**Database Tables**:
- `schedule_attendees` - Attendance records (class_schedule_id + student_id)

**Important Notes**:
- ✅ Admin-only endpoints
- ✅ Capacity enforcement via trigger (courses.max_students)
- ✅ Attendance tracking for reporting

## Communication Patterns

### Synchronous Communication (HTTP REST)
Digunakan untuk request-response yang membutuhkan immediate result.

**Use Cases**:
- API Gateway → Services routing
- Enrollment Service → User Service (create student user)
- Enrollment Service → Course Service (validate course exists)
- Auth Service → User Service (get admin profile)
- Schedule Service → Course Service (get course & room details)

**Pattern**:
```typescript
const response = await fetch(`${SERVICE_URL}/endpoint`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${serviceToken}`,
    'X-Service-Name': 'calling-service-name'
  }
})
```

### Asynchronous Communication (Redis Pub/Sub)
Digunakan untuk event-driven communication yang tidak butuh immediate response.

**Use Cases**:
- Enrollment Service → Notification Service (enrollment created/approved/rejected)
- Chat Service → Admin Dashboard (new messages)
- Attendance Service → Analytics Service (attendance marked)
- User Service → Email Service (send confirmation emails)

**Event Channels**:
- `enrollment.created` - New enrollment submitted (public form)
- `enrollment.approved` - Admin approved enrollment
- `enrollment.rejected` - Admin rejected enrollment
- `chat.message` - Real-time chat messages
- `attendance.marked` - Attendance recorded by admin

**Pattern**:
```typescript
// Publisher
await redis.publish('event.name', JSON.stringify(eventData))

// Subscriber
redis.subscribe('event.name')
redis.on('message', (channel, message) => {
  const data = JSON.parse(message)
  // Handle event
})
```

## Service Discovery

Untuk development phase, menggunakan **hardcoded URLs via environment variables**.

Setiap service mendefinisikan service lain yang dibutuhkan di `.env`:
```env
USER_SERVICE_URL=http://user-service:3002
COURSE_SERVICE_URL=http://course-service:3003
```

**Note**: Untuk production, bisa upgrade ke service discovery tools seperti Consul atau Kubernetes Service Discovery.

## Data Storage Strategy

### Database Ownership
Setiap service **TIDAK** share tables secara direct. Akses data service lain harus melalui API.

**Ownership**:
- **User Service** owns: `users` table
- **Course Service** owns: `courses`, `class_schedules`, `rooms` tables
- **Enrollment Service** owns: `enrollments` table
- **Attendance Service** owns: `schedule_attendees` table
- **Chat Service** owns: `chat_sessions`, `chat_messages` tables

**Important**: `users.firebase_uid` = NULL untuk students/instructors, non-NULL untuk admin

### Shared Database (Supabase)
Meskipun menggunakan shared Supabase instance, setiap service hanya boleh akses tables yang dimiliki.

**Benefits**:
- Simplified infrastructure untuk development
- Easier database migrations
- Cost-effective untuk project size ini

**Trade-offs**:
- Tidak ada database isolation
- Perlu discipline dalam service boundaries

### Caching Strategy (Redis)
Redis digunakan untuk:
- **Data Caching**: Course catalog (TTL: 1 jam), available schedules (TTL: 5 menit)
- **Pub/Sub**: Event-driven communication (enrollment, chat, attendance)
- **Idempotency Keys**: Store submitted enrollment keys (TTL: 24 jam)
- **Rate Limiting**: Track request counts per IP for public endpoints

## Scalability Considerations

### Horizontal Scaling
Setiap service bisa di-scale independently dengan menambah container replicas.

**Example**:
```yaml
booking-service:
  deploy:
    replicas: 3  # Run 3 instances
```

### Bottleneck Services
Services yang mungkin butuh scaling lebih:
- **Chat Service**: Banyak WebSocket connections (public access)
- **Enrollment Service**: Public form submissions (rate limiting needed)
- **API Gateway**: Entry point untuk semua traffic
- **Course Service**: High read traffic dari public browsing

### Database Scaling
Supabase PostgreSQL support:
- Connection pooling
- Read replicas (untuk read-heavy queries)
- Vertical scaling (upgrade instance)

## Security Architecture

### Authentication Flow (Admin Only)
1. **Admin** login via Firebase SDK di frontend
2. Firebase returns ID token (valid 1 hour)
3. Frontend sends requests dengan Firebase ID token di Authorization header
4. **Auth Service** verifies token dengan Firebase Admin SDK
5. If valid admin, get profile dari User Service
6. Return admin data to client

**For Public Endpoints** (students):
- ❌ NO authentication required
- ✅ Captcha validation for enrollment form
- ✅ Idempotency keys prevent duplicate submissions
- ✅ Rate limiting per IP address

### Service-to-Service Authentication
Menggunakan separate `SERVICE_JWT_SECRET` untuk internal communication.

**Pattern**:
```typescript
// Service generates internal token
const serviceToken = jwt.sign(
  { service: 'enrollment-service', scope: 'internal' },
  SERVICE_JWT_SECRET
)

// Target service validates
const payload = jwt.verify(token, SERVICE_JWT_SECRET)
```

### Data Security
- **Admin passwords**: Managed by Firebase (automatic hashing)
- **Student data**: No passwords (no authentication)
- Supabase Service Role Key tidak exposed ke client
- Environment variables untuk sensitive data (Firebase keys, Supabase keys)
- HTTPS untuk production
- Captcha validation (Turnstile/reCAPTCHA) untuk public forms

## Monitoring & Observability

### Health Checks
Setiap service expose `/health` endpoint:
```typescript
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    service: 'auth-service',
    timestamp: new Date()
  })
})
```

### Logging Strategy
- Structured logging dengan log levels (info, warn, error)
- Request/response logging di API Gateway
- Error logging dengan stack traces
- Event logging untuk Redis Pub/Sub

### Metrics to Monitor
- Request latency per service
- Error rates
- Database connection pool usage
- Redis memory usage
- Active WebSocket connections (Chat Service)
- Public endpoint rate limit violations
- Firebase token verification failures
- Enrollment form submission rate

## Disaster Recovery

### Service Failure Scenarios
1. **Single Service Down**: API Gateway returns 503, other services continue
2. **Redis Down**: Services lose caching & pub/sub, fallback to direct DB
3. **Supabase Down**: All services affected, return 500 errors
4. **API Gateway Down**: Complete system unavailable

### Mitigation Strategies
- Implement circuit breaker pattern
- Retry logic dengan exponential backoff
- Graceful degradation (e.g., skip caching if Redis down)
- Database connection pooling & retry

## Future Enhancements

### Phase 2 Improvements
- Service mesh (Istio/Linkerd) untuk advanced traffic management
- Distributed tracing (Jaeger/Zipkin)
- Centralized logging (ELK stack)
- API Gateway rate limiting & throttling
- Circuit breaker implementation (Hystrix pattern)

### Scaling to Production
- Kubernetes orchestration
- Load balancer (NGINX/Traefik)
- Separate database per service (true microservices)
- Message queue (RabbitMQ/Kafka) instead of Redis Pub/Sub
- Monitoring dashboard (Grafana/Prometheus)
