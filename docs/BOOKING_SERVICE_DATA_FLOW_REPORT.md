# Booking Service Data Flow Report

## Overview
Booking Service menangani pendaftaran kursus dan manajemen booking/enrollment. Service ini menggunakan Supabase untuk database dan Redis untuk caching dan event publishing.

## Endpoints dan Data Flow

### Course Registration (Public)

#### 1. POST /api/booking/register-course
**Purpose:** Pendaftaran kursus tanpa membuat akun user

**Data Flow:**
1. **Input Validation:** Validasi data pendaftaran (nama, email, WA, course_id, dll)
2. **Idempotency Check:** Cek Redis untuk mencegah duplicate registration
3. **Course Verification:** Cek apakah course exists dan active
4. **Spam Prevention:** Cek existing pending bookings untuk email yang sama
5. **Database Insert:** Insert ke `bookings` table dengan applicant_* fields (tanpa user_id)
6. **Redis Cache:** Store idempotency key (TTL 24 jam)
7. **Event Publishing:** Publish `booking.created` event ke Redis
8. **Response:** Return booking data

**Database Tables:** `bookings` (booking schema)
**Cache:** Redis `course_registration:{idempotency_key}`
**Events:** Redis publish `booking.created`

### Booking Management (Admin)

#### 1. GET /api/booking/pending
**Purpose:** Mendapatkan list booking pending untuk konfirmasi admin

**Data Flow:**
1. **Database Query:** Query `bookings` where status='pending' dengan join ke courses
2. **Response:** Return pending bookings list

**Database Tables:** `bookings`, `courses` (booking schema)

#### 2. DELETE /api/booking/:id
**Purpose:** Delete booking (admin only)

**Data Flow:**
1. **Parameter Validation:** Validasi booking ID
2. **Database Delete:** Delete dari `bookings` table
3. **Response:** Success message

**Database Tables:** `bookings` (booking schema)

#### 3. POST /api/bookings/create (dari Gateway)
**Purpose:** Membuat booking untuk user yang sudah login

**Data Flow:**
1. **Auth Check:** Pastikan user sudah login
2. **Input Validation:** Validasi booking data
3. **Database Insert:** Insert ke `bookings` table dengan user_id
4. **Response:** Return booking data

**Database Tables:** `bookings` (booking schema)

#### 4. GET /api/bookings/user/:userId
**Purpose:** Mendapatkan bookings untuk user tertentu

**Data Flow:**
1. **Auth Check:** Pastikan user dapat akses data ini
2. **Database Query:** Query `bookings` by user_id dengan join ke courses
3. **Response:** Return user bookings

**Database Tables:** `bookings`, `courses` (booking schema)

#### 5. POST /api/bookings/:id/confirm (Admin)
**Purpose:** Konfirmasi booking pending

**Data Flow:**
1. **Auth Check:** Admin only
2. **Status Update:** Update status dari 'pending' ke 'confirmed'
3. **Enrollment Creation:** Buat enrollment record jika diperlukan
4. **Response:** Return updated booking

**Database Tables:** `bookings`, `enrollments` (booking schema)

#### 6. POST /api/bookings/:id/reject (Admin)
**Purpose:** Reject booking pending

**Data Flow:**
1. **Auth Check:** Admin only
2. **Status Update:** Update status ke 'rejected'
3. **Response:** Return updated booking

**Database Tables:** `bookings` (booking schema)

### Enrollment Management (Admin)

#### 1. POST /api/booking/enrollments
**Purpose:** Membuat enrollment untuk student

**Data Flow:**
1. **Input Validation:** Validasi enrollment data
2. **Database Insert:** Insert ke `enrollments` table
3. **Response:** Return enrollment data

**Database Tables:** `enrollments` (booking schema)

#### 2. GET /api/booking/enrollments
**Purpose:** Mendapatkan list enrollments

**Data Flow:**
1. **Query Parameters:** Parse filters dan pagination
2. **Database Query:** Query `enrollments` dengan joins ke users dan courses
3. **Response:** Return enrollments list

**Database Tables:** `enrollments`, `users`, `courses` (booking schema)

#### 3. GET /api/booking/enrollments/:id
**Purpose:** Mendapatkan enrollment by ID

**Data Flow:**
1. **Database Query:** Query single enrollment dengan joins
2. **Response:** Return enrollment data

**Database Tables:** `enrollments` (booking schema)

#### 4. PUT /api/booking/enrollments/:id
**Purpose:** Update enrollment

**Data Flow:**
1. **Input Validation:** Validasi update data
2. **Database Update:** Update `enrollments` table
3. **Response:** Return updated enrollment

**Database Tables:** `enrollments` (booking schema)

## Authentication & Authorization
- **Public Endpoints:** POST /register-course (untuk pendaftaran kursus)
- **Protected Endpoints:** Semua endpoint lain memerlukan authentication
- **Admin Only:** Booking management, enrollment CRUD
- **User Access:** User dapat melihat bookings mereka sendiri

## Database Schema
- **bookings:** id, course_id, user_id (optional), status, applicant_*, experience_level, preferred_days, dll
- **enrollments:** id, student_id, course_id, status, enrolled_at

## Caching & Events
- **Idempotency:** Redis cache untuk mencegah duplicate registrations
- **Events:** Redis publish untuk booking.created events
- **TTL:** Idempotency keys 24 jam

## Spam Prevention
- **Idempotency Keys:** Mencegah duplicate requests
- **Email Limits:** Max 3 pending bookings per email (via database trigger)
- **Captcha:** Required untuk course registration

## Error Handling
- **Validation Errors:** Zod schema validation
- **Business Logic:** Custom error codes untuk duplicate bookings, course not found
- **Database Errors:** Supabase error handling

## Dependencies
- Supabase untuk database operations
- Redis untuk caching dan event publishing
- Zod untuk input validation
- Hono untuk HTTP framework