# Admin Service Data Flow Report

## Overview
Admin Service menangani manajemen user dan instructor profiles. Service ini menggunakan Supabase untuk persistence dan Redis untuk caching dan event publishing.

## Endpoints dan Data Flow

### User Management

#### 1. POST /api/users (Service-to-Service)
**Purpose:** Membuat user baru (dipanggil dari auth service)

**Data Flow:**
1. **Input Validation:** Validasi email, full_name, role, dll menggunakan Zod
2. **Email Uniqueness Check:** Cek apakah email sudah ada di database
3. **Database Insert:** Insert ke `users` table
4. **Event Publishing:** Publish event `user.registered` ke Redis untuk notifikasi service lain
5. **Response:** Return user data

**Database Tables:** `users` (public schema)
**Events:** Redis publish `user.registered`

#### 2. GET /api/users/:id
**Purpose:** Mendapatkan user berdasarkan ID

**Data Flow:**
1. **Cache Check:** Cek Redis cache `user:{userId}` (TTL 5 menit)
2. **Database Query:** Jika tidak ada di cache, query dari `users` table
3. **Cache Storage:** Simpan hasil ke Redis cache
4. **Response:** Return user data dengan flag cached

**Database Tables:** `users` (public schema)
**Cache:** Redis `user:{userId}` (TTL 300s)

#### 3. PUT /api/users/:id
**Purpose:** Update user data

**Data Flow:**
1. **Input Validation:** Validasi fields yang akan diupdate
2. **Database Update:** Update `users` table
3. **Cache Invalidation:** Hapus cache `user:{userId}` dari Redis
4. **Response:** Return updated user data

**Database Tables:** `users` (public schema)
**Cache:** Invalidate `user:{userId}`

#### 4. GET /api/users
**Purpose:** Mendapatkan list users (admin only)

**Data Flow:**
1. **Query Parameters:** Parse query params (pagination, filters)
2. **Database Query:** Query `users` table dengan filters
3. **Response:** Return paginated user list

**Database Tables:** `users` (public schema)

#### 5. DELETE /api/users/:id (Admin Only)
**Purpose:** Soft delete user

**Data Flow:**
1. **Authorization Check:** Pastikan user adalah admin
2. **Database Delete:** Soft delete dari `users` table
3. **Cache Cleanup:** Hapus related cache
4. **Response:** Success message

**Database Tables:** `users` (public schema)

#### 6. GET /api/users/by-email (Service-to-Service)
**Purpose:** Mendapatkan user berdasarkan email

**Data Flow:**
1. **Database Query:** Query `users` table by email
2. **Response:** Return user data atau null

**Database Tables:** `users` (public schema)

#### 7. POST /api/users/:id/last-login (Service-to-Service)
**Purpose:** Update last login timestamp

**Data Flow:**
1. **Database Update:** Update `last_login_at` di `users` table
2. **Response:** Success message

**Database Tables:** `users` (public schema)

#### 8. GET /api/users/stats (Admin Only)
**Purpose:** Mendapatkan user statistics

**Data Flow:**
1. **Database Aggregation:** Count users by role, dll
2. **Response:** Return statistics object

**Database Tables:** `users` (public schema)

### Instructor Management

#### 1. POST /api/instructors (Admin Only)
**Purpose:** Membuat instructor profile

**Data Flow:**
1. **Input Validation:** Validasi instructor data
2. **User Check:** Pastikan user exists dan role sesuai
3. **Database Insert:** Insert ke `instructor_profiles` table
4. **Response:** Return instructor data

**Database Tables:** `instructor_profiles` (public schema)

#### 2. GET /api/instructors
**Purpose:** Mendapatkan list instructors

**Data Flow:**
1. **Database Query:** Query `instructor_profiles` dengan join ke `users`
2. **Response:** Return instructor list

**Database Tables:** `instructor_profiles`, `users` (public schema)

#### 3. GET /api/instructors/:userId
**Purpose:** Mendapatkan instructor profile berdasarkan user ID

**Data Flow:**
1. **Database Query:** Query `instructor_profiles` by user_id
2. **Response:** Return instructor data

**Database Tables:** `instructor_profiles` (public schema)

#### 4. PUT /api/instructors/:userId
**Purpose:** Update instructor profile

**Data Flow:**
1. **Input Validation:** Validasi update data
2. **Database Update:** Update `instructor_profiles` table
3. **Response:** Return updated data

**Database Tables:** `instructor_profiles` (public schema)

#### 5. DELETE /api/instructors/:userId (Admin Only)
**Purpose:** Delete instructor profile

**Data Flow:**
1. **Database Delete:** Delete dari `instructor_profiles` table
2. **Response:** Success message

**Database Tables:** `instructor_profiles` (public schema)

## Authentication & Authorization
- **Service Auth:** Menggunakan `serviceAuthMiddleware` untuk service-to-service calls
- **User Auth:** Menggunakan `authMiddleware` untuk user requests
- **Role Checks:** `requireRole(['admin'])` untuk admin-only endpoints
- **Combined Access:** Beberapa endpoint dapat diakses admin dan instructor

## Caching Strategy
- **User Data:** Redis cache dengan TTL 5 menit
- **Cache Keys:** `user:{userId}`
- **Cache Invalidation:** Pada update/delete operations

## Event System
- **Redis Publish:** Event `user.registered` saat user baru dibuat
- **Purpose:** Notifikasi ke service lain untuk sync data

## Error Handling
- **Validation Errors:** Zod schema validation
- **Database Errors:** Supabase error handling
- **Cache Errors:** Redis errors logged tapi tidak block operation
- **Auth Errors:** Middleware handles unauthorized access

## Database Schema
- **users table:** id, email, full_name, role, firebase_uid, dll
- **instructor_profiles table:** user_id, bio, specialties, experience_years, dll

## Dependencies
- Supabase untuk database operations
- Redis untuk caching dan event publishing
- Zod untuk input validation
- Hono untuk HTTP framework