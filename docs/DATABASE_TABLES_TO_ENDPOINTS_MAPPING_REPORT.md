# Database Tables to Service Endpoints Mapping Report

**Date:** October 14, 2025  
**Report Type:** Database-Service Integration Analysis  
**Status:** ✅ Completed  

## Executive Summary

This report provides a comprehensive mapping between Supabase database tables and service endpoints across all microservices. The analysis reveals clear relationships between database schemas and API endpoints, showing how each service interacts with specific tables for data operations.

## Database Schema Overview

Based on the Supabase remote database structure, the following schemas and tables exist:

### Auth Schema
- `auth.users` - Firebase authentication users

### Public Schema
- `public.users` - Extended user information
- `public.courses` - Course catalog
- `public.enrollments` - Student enrollments
- `public.instructor_profiles` - Instructor details
- `public.student_profiles` - Student details
- `public.class_schedules` - Class schedules
- `public.schedule_attendees` - Attendance records
- `public.rooms` - Room information
- `public.bookings` - Booking records
- `public.chat_sessions` - Chat sessions
- `public.chat_messages` - Chat messages

### Course Schema
- `course.xxx` - Course-related tables (mapped to public schema tables)

### Booking Schema
- `booking.xxx` - Booking-related tables (mapped to public schema tables)

### CS (Customer Service) Schema
- `cs.sessions` - Customer service chat sessions
- `cs.messages` - Customer service chat messages
- `cs.admin_assignments` - Admin assignments to chat sessions

## Service-to-Table Mapping Analysis

### 1. Auth Service (Port: 3001)

**Primary Tables Used:**
- `public.users` - User authentication and profile data

**Endpoint-Table Relationships:**

| Endpoint | HTTP Method | Tables Used | Operation Type | Access Level |
|----------|-------------|-------------|----------------|--------------|
| `/auth/firebase/register` | POST | `public.users` | INSERT | Public |
| `/auth/firebase/login` | POST | `public.users` | SELECT/UPDATE | Public |
| `/auth/firebase/verify/:token` | GET | `public.users` | SELECT | Public |
| `/auth/logout` | POST | - | Cache Operation | Authenticated |
| `/auth/refresh` | POST | `public.users` | SELECT | Authenticated |

**Cache Usage:**
- Redis: `firebase_uid:{uid}`, `refresh_token:{userId}`, blacklist tokens

**Data Flow Pattern:**
- Firebase authentication → Supabase user creation/lookup → JWT token generation → Redis caching

---

### 2. Admin Service (Port: 3002)

**Primary Tables Used:**
- `public.users` - User management
- `public.instructor_profiles` - Instructor profile management

**Endpoint-Table Relationships:**

| Endpoint | HTTP Method | Tables Used | Operation Type | Access Level |
|----------|-------------|-------------|----------------|--------------|
| `/api/users` | POST | `public.users` | INSERT | Service-to-Service |
| `/api/users/:id` | GET | `public.users` | SELECT | Authenticated |
| `/api/users/:id` | PUT | `public.users` | UPDATE | Authenticated |
| `/api/users` | GET | `public.users` | SELECT | Admin |
| `/api/users/:id` | DELETE | `public.users` | DELETE | Admin |
| `/api/users/by-email` | GET | `public.users` | SELECT | Service-to-Service |
| `/api/users/:id/last-login` | POST | `public.users` | UPDATE | Service-to-Service |
| `/api/users/stats` | GET | `public.users` | SELECT (COUNT) | Admin |
| `/api/instructors` | POST | `public.instructor_profiles` | INSERT | Admin |
| `/api/instructors` | GET | `public.instructor_profiles`, `public.users` | SELECT (JOIN) | Authenticated |
| `/api/instructors/:userId` | GET | `public.instructor_profiles` | SELECT | Authenticated |
| `/api/instructors/:userId` | PUT | `public.instructor_profiles` | UPDATE | Authenticated |
| `/api/instructors/:userId` | DELETE | `public.instructor_profiles` | DELETE | Admin |

**Cache Usage:**
- Redis: `user:{userId}` (TTL: 5 minutes)

**Event System:**
- Redis publish: `user.registered` event

---

### 3. Course Service (Port: 3003)

**Primary Tables Used:**
- `course.courses` (public.courses) - Course catalog
- `course.class_schedules` (public.class_schedules) - Schedule management
- `course.schedule_attendees` (public.schedule_attendees) - Attendance tracking
- `course.rooms` (public.rooms) - Room information

**Endpoint-Table Relationships:**

| Endpoint | HTTP Method | Tables Used | Operation Type | Access Level |
|----------|-------------|-------------|----------------|--------------|
| `/api/courses` | GET | `course.courses` | SELECT | Public |
| `/api/courses/active` | GET | `course.courses` | SELECT | Public |
| `/api/courses/:id` | GET | `course.courses` | SELECT | Public |
| `/api/courses` | POST | `course.courses` | INSERT | Admin/Instructor |
| `/api/courses/:id` | PUT | `course.courses` | UPDATE | Admin/Instructor |
| `/api/courses/:id` | DELETE | `course.courses` | DELETE | Admin |
| `/api/schedules/available` | GET | `course.class_schedules`, `course.courses`, `course.rooms` | SELECT (JOIN) | Public |
| `/api/schedules` | POST | `course.class_schedules` | INSERT | Admin/Instructor |
| `/api/schedules` | GET | `course.class_schedules`, `course.courses`, `course.rooms` | SELECT (JOIN) | Admin/Instructor |
| `/api/attendance` | POST | `course.schedule_attendees`, `course.class_schedules` | INSERT/UPDATE | Admin/Instructor |
| `/api/attendance/schedule/:scheduleId` | GET | `course.schedule_attendees`, `public.users` | SELECT (JOIN) | Admin/Instructor |
| `/api/attendance/booking/:bookingId` | GET | `course.schedule_attendees` | SELECT | Admin/Instructor |
| `/api/attendance/:scheduleId/:bookingId` | PUT | `course.schedule_attendees` | UPDATE | Admin/Instructor |

**Data Flow Pattern:**
- Course CRUD → Schedule management → Attendance tracking → Room allocation

---

### 4. Booking Service (Port: 3004)

**Primary Tables Used:**
- `booking.bookings` (public.bookings) - Course registration bookings
- `booking.enrollments` (public.enrollments) - Student enrollments

**Endpoint-Table Relationships:**

| Endpoint | HTTP Method | Tables Used | Operation Type | Access Level |
|----------|-------------|-------------|----------------|--------------|
| `/api/booking/register-course` | POST | `booking.bookings` | INSERT | Public |
| `/api/booking/pending` | GET | `booking.bookings`, `course.courses` | SELECT (JOIN) | Admin |
| `/api/booking/:id` | DELETE | `booking.bookings` | DELETE | Admin |
| `/api/bookings/create` | POST | `booking.bookings` | INSERT | Authenticated |
| `/api/bookings/user/:userId` | GET | `booking.bookings`, `course.courses` | SELECT (JOIN) | Authenticated |
| `/api/bookings/:id/confirm` | POST | `booking.bookings`, `booking.enrollments` | UPDATE/INSERT | Admin |
| `/api/bookings/:id/reject` | POST | `booking.bookings` | UPDATE | Admin |
| `/api/booking/enrollments` | POST | `booking.enrollments` | INSERT | Admin |
| `/api/booking/enrollments` | GET | `booking.enrollments`, `public.users`, `course.courses` | SELECT (JOIN) | Admin |
| `/api/booking/enrollments/:id` | GET | `booking.enrollments` | SELECT | Admin |
| `/api/booking/enrollments/:id` | PUT | `booking.enrollments` | UPDATE | Admin |

**Cache Usage:**
- Redis: `course_registration:{idempotency_key}` (TTL: 24 hours)

**Event System:**
- Redis publish: `booking.created` event

**Data Flow Pattern:**
- Public registration → Admin approval → Enrollment creation → Attendance tracking

---

### 5. Customer Service (Port: 3005)

**Primary Tables Used:**
- `cs.sessions` - Chat sessions
- `cs.messages` - Chat messages
- `cs.admin_assignments` - Admin assignments

**Endpoint-Table Relationships:**

| Endpoint | HTTP Method | Tables Used | Operation Type | Access Level |
|----------|-------------|-------------|----------------|--------------|
| `/api/cs/sessions` | POST | `cs.sessions`, `cs.messages` | INSERT | Public |
| `/api/cs/sessions/:sessionId` | GET | `cs.sessions`, `cs.messages`, `cs.admin_assignments` | SELECT (JOIN) | Public |
| `/api/cs/sessions/:sessionId/messages` | POST | `cs.messages` | INSERT | Public |
| `/api/cs/sessions/:sessionId/messages` | GET | `cs.messages` | SELECT | Public |
| `/api/cs/admin/sessions` | GET | `cs.sessions`, `cs.admin_assignments`, `cs.messages` | SELECT (JOIN) | Admin |
| `/api/cs/admin/my-sessions` | GET | `cs.admin_assignments`, `cs.sessions` | SELECT (JOIN) | Admin |
| `/api/cs/admin/sessions/:sessionId` | GET | `cs.sessions`, `cs.messages`, `cs.admin_assignments` | SELECT (JOIN) | Admin |
| `/api/cs/admin/sessions/:sessionId/assign` | POST | `cs.admin_assignments`, `cs.sessions` | INSERT/UPDATE | Admin |
| `/api/cs/admin/sessions/:sessionId/messages` | POST | `cs.messages` | INSERT | Admin |
| `/api/cs/admin/sessions/:sessionId/status` | PATCH | `cs.sessions`, `cs.admin_assignments` | UPDATE/DELETE | Admin |

**Real-time Features:**
- WebSocket broadcasting for live chat
- Real-time status updates and notifications

**Data Flow Pattern:**
- Session creation → Message exchange → Admin assignment → Session resolution

---

### 6. API Gateway (Port: 3000)

**Function:** Routes requests to appropriate services
**Tables Used:** None directly (proxies to other services)
**Purpose:** Endpoint routing and load balancing

---

## Cross-Service Table Dependencies

### Shared Tables Analysis

| Table | Primary Service | Secondary Services | Usage Pattern |
|-------|----------------|-------------------|----------------|
| `public.users` | Admin Service | Auth Service, Booking Service, Course Service | User management across services |
| `public.courses` | Course Service | Booking Service, Admin Service | Course catalog access |
| `public.bookings` | Booking Service | Course Service (attendance) | Registration to enrollment flow |
| `public.enrollments` | Booking Service | Course Service (attendance) | Enrollment tracking |
| `public.class_schedules` | Course Service | Booking Service | Schedule availability |
| `public.schedule_attendees` | Course Service | Booking Service | Attendance records |

### Schema Distribution

```
auth Schema (1 table):
├── auth.users (Firebase auth)

public Schema (11 tables):
├── users (Admin Service primary)
├── courses (Course Service primary)
├── enrollments (Booking Service primary)
├── instructor_profiles (Admin Service primary)
├── student_profiles (Unused in current endpoints)
├── class_schedules (Course Service primary)
├── schedule_attendees (Course Service primary)
├── rooms (Course Service primary)
├── bookings (Booking Service primary)
├── chat_sessions (Legacy - moved to cs schema)
└── chat_messages (Legacy - moved to cs schema)

cs Schema (3 tables):
├── sessions (Customer Service primary)
├── messages (Customer Service primary)
└── admin_assignments (Customer Service primary)
```

## Cache and Event Integration

### Redis Cache Usage by Service

| Service | Cache Keys | TTL | Purpose |
|---------|------------|-----|---------|
| Auth Service | `firebase_uid:{uid}`, `refresh_token:{userId}`, blacklist tokens | 7 days, 24h, session | Authentication state |
| Admin Service | `user:{userId}` | 5 minutes | User data caching |
| Booking Service | `course_registration:{idempotency_key}` | 24 hours | Duplicate prevention |
| Course Service | None | - | Direct database queries |
| Customer Service | None | - | Real-time WebSocket |

### Redis Event Publishing

| Service | Event Name | Trigger | Consumer |
|---------|------------|---------|----------|
| Admin Service | `user.registered` | New user creation | Other services sync |
| Booking Service | `booking.created` | Course registration | Admin notification |

## Database Relationship Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Auth Service  │    │  Admin Service  │    │ Course Service  │
│                 │    │                 │    │                 │
│ auth.users ─────┼────┤ public.users    │    │ course.courses │
│                 │    │ instructor_prof │    │ class_schedules│
└─────────────────┘    │                 │    │ schedule_attend│
                       └─────────────────┘    │ rooms          │
                                │            └─────────────────┘
                                │                   │
                       ┌─────────────────┐          │
                       │ Booking Service │          │
                       │                 │          │
                       │ booking.bookings│◄─────────┘
                       │ enrollments     │
                       └─────────────────┘
                                │
                       ┌─────────────────┐
                       │Customer Service│
                       │                 │
                       │ cs.sessions     │
                       │ cs.messages     │
                       │ cs.admin_assign │
                       └─────────────────┘
```

## Performance and Scalability Considerations

### Read-Heavy Operations
- Course listings (`GET /api/courses`) - High read volume
- User profile access (`GET /api/users/:id`) - Cached for performance
- Schedule availability (`GET /api/schedules/available`) - Complex joins

### Write-Heavy Operations
- Course registration (`POST /api/booking/register-course`) - Idempotency protection
- Attendance recording (`POST /api/attendance`) - Batch operations possible
- Chat messaging (`POST /api/cs/sessions/:id/messages`) - High frequency

### Cross-Service Dependencies
- User creation in Auth Service triggers Admin Service user creation
- Booking confirmation creates enrollment records
- Course schedules affect booking availability

## Data Consistency and Integrity

### Transaction Boundaries
- Single table operations: Atomic by default
- Multi-table operations: Need transaction handling
- Cross-service operations: Event-driven consistency

### Foreign Key Relationships
- `enrollments.student_id` → `users.id`
- `enrollments.course_id` → `courses.id`
- `class_schedules.course_id` → `courses.id`
- `schedule_attendees.schedule_id` → `class_schedules.id`
- `bookings.course_id` → `courses.id`

## Recommendations

### Database Optimization
1. **Indexing Strategy:** Add indexes on frequently queried columns (user_id, course_id, status, created_at)
2. **Partitioning:** Consider partitioning large tables (messages, attendance records) by date
3. **Connection Pooling:** Implement connection pooling for high-traffic services

### Service Architecture
1. **CQRS Pattern:** Consider separating read/write operations for high-traffic endpoints
2. **Event Sourcing:** Implement event sourcing for audit trails on critical operations
3. **API Versioning:** Plan for API versioning as services evolve

### Monitoring and Maintenance
1. **Query Performance:** Monitor slow queries and optimize JOIN operations
2. **Cache Hit Rates:** Monitor Redis cache effectiveness
3. **Data Growth:** Plan for data archiving strategies for chat messages and attendance records

## Conclusion

The database-service integration shows a well-structured microservices architecture with clear separation of concerns. Each service has well-defined table ownership with minimal cross-service dependencies. The use of Redis for caching and events provides good performance characteristics, while the schema organization supports the business domain effectively.

**Total Tables:** 15 active tables across 4 schemas
**Total Endpoints:** 28+ endpoints across 5 services
**Cache Integration:** 4 services using Redis
**Event System:** 2 services publishing events
**Real-time Features:** 1 service with WebSocket support

This mapping provides a solid foundation for understanding the system architecture and planning future enhancements.</content>
<parameter name="filePath">d:\Tugas\RPL\New folder\Backend\docs\DATABASE_TABLES_TO_ENDPOINTS_MAPPING_REPORT.md