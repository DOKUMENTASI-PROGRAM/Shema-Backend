# Course Service Data Flow Report

## Overview
Course Service menangani manajemen kursus, jadwal, dan absensi. Service ini menggunakan Supabase untuk semua operasi database.

## Endpoints dan Data Flow

### Course Management

#### 1. GET /api/courses
**Purpose:** Mendapatkan list kursus dengan filtering dan pagination

**Data Flow:**
1. **Query Parameter Validation:** Validasi filters (level, is_active, price range, pagination)
2. **Database Query:** Query `courses` table dengan filters dan sorting by created_at DESC
3. **Pagination:** Apply limit/offset
4. **Response:** Return courses array dengan pagination info

**Database Tables:** `courses` (course schema)

#### 2. GET /api/courses/active
**Purpose:** Mendapatkan kursus aktif saja

**Data Flow:**
1. **Database Query:** Query `courses` where `is_active = true`
2. **Response:** Return active courses

**Database Tables:** `courses` (course schema)

#### 3. GET /api/courses/:id
**Purpose:** Mendapatkan detail kursus berdasarkan ID

**Data Flow:**
1. **Parameter Validation:** Validasi course ID
2. **Database Query:** Select single course by ID
3. **Error Handling:** Return 404 jika tidak ditemukan
4. **Response:** Return course data

**Database Tables:** `courses` (course schema)

#### 4. POST /api/courses (Admin/Instructor)
**Purpose:** Membuat kursus baru

**Data Flow:**
1. **Input Validation:** Validasi course data menggunakan Zod schema
2. **Database Insert:** Insert ke `courses` table dengan timestamps
3. **Response:** Return created course data

**Database Tables:** `courses` (course schema)

#### 5. PUT /api/courses/:id (Admin/Instructor)
**Purpose:** Update kursus

**Data Flow:**
1. **Parameter Validation:** Validasi course ID
2. **Input Validation:** Validasi update data
3. **Existence Check:** Cek apakah course exists
4. **Database Update:** Update `courses` table dengan updated_at
5. **Response:** Return updated course data

**Database Tables:** `courses` (course schema)

#### 6. DELETE /api/courses/:id (Admin)
**Purpose:** Delete kursus

**Data Flow:**
1. **Parameter Validation:** Validasi course ID
2. **Existence Check:** Cek apakah course exists
3. **Database Delete:** Delete dari `courses` table
4. **Response:** Success message

**Database Tables:** `courses` (course schema)

### Schedule Management

#### 1. GET /api/schedules/available
**Purpose:** Mendapatkan jadwal yang tersedia untuk booking

**Data Flow:**
1. **Query Parameters:** Parse filters (course_id, date range, dll)
2. **Database Query:** Query `class_schedules` dengan joins ke courses dan rooms
3. **Availability Check:** Filter jadwal yang belum penuh (current_attendees < max_attendees)
4. **Response:** Return available schedules

**Database Tables:** `class_schedules`, `courses`, `rooms` (course schema)

#### 2. POST /api/schedules (Admin/Instructor)
**Purpose:** Membuat jadwal kelas baru

**Data Flow:**
1. **Input Validation:** Validasi schedule data
2. **Conflict Check:** Cek konflik waktu di room yang sama
3. **Database Insert:** Insert ke `class_schedules` table
4. **Response:** Return created schedule

**Database Tables:** `class_schedules` (course schema)

#### 3. GET /api/schedules (Admin/Instructor)
**Purpose:** Mendapatkan semua jadwal

**Data Flow:**
1. **Database Query:** Query `class_schedules` dengan joins
2. **Response:** Return schedules list

**Database Tables:** `class_schedules`, `courses`, `rooms` (course schema)

### Attendance Management

#### 1. POST /api/attendance (Admin/Instructor)
**Purpose:** Record absensi siswa

**Data Flow:**
1. **Input Validation:** Validasi attendance data (schedule_id, booking_id, status)
2. **Database Insert:** Insert ke `schedule_attendees` table
3. **Update Count:** Update current_attendees di `class_schedules`
4. **Response:** Return attendance record

**Database Tables:** `schedule_attendees`, `class_schedules` (course schema)

#### 2. GET /api/attendance/schedule/:scheduleId (Admin/Instructor)
**Purpose:** Mendapatkan absensi berdasarkan schedule

**Data Flow:**
1. **Database Query:** Query `schedule_attendees` by schedule_id dengan join ke users
2. **Response:** Return attendance list

**Database Tables:** `schedule_attendees`, `users` (course schema)

#### 3. GET /api/attendance/booking/:bookingId (Admin/Instructor)
**Purpose:** Mendapatkan absensi berdasarkan booking

**Data Flow:**
1. **Database Query:** Query `schedule_attendees` by booking_id
2. **Response:** Return attendance record

**Database Tables:** `schedule_attendees` (course schema)

#### 4. PUT /api/attendance/:scheduleId/:bookingId (Admin/Instructor)
**Purpose:** Update status absensi

**Data Flow:**
1. **Parameter Validation:** Validasi schedule_id dan booking_id
2. **Input Validation:** Validasi status update
3. **Database Update:** Update `schedule_attendees` table
4. **Response:** Return updated attendance

**Database Tables:** `schedule_attendees` (course schema)

## Authentication & Authorization
- **Public Endpoints:** GET courses, GET course by ID, GET available schedules
- **Protected Endpoints:** Semua POST/PUT/DELETE memerlukan auth
- **Role Requirements:**
  - Admin: Full access ke semua endpoints
  - Instructor: Create/update courses, schedules, attendance
  - Student: Read-only access

## Database Schema
- **courses:** id, title, description, level, price_per_session, is_active, dll
- **class_schedules:** id, course_id, instructor_id, room_id, start_time, end_time, max_attendees, current_attendees
- **schedule_attendees:** schedule_id, booking_id, user_id, status, attended_at
- **rooms:** id, name, capacity, location

## Error Handling
- **Validation Errors:** Zod schema validation untuk input
- **Database Errors:** Supabase error codes (PGRST116 untuk not found)
- **Business Logic Errors:** Custom error codes untuk business rules

## Dependencies
- Supabase untuk database operations
- Zod untuk input validation
- Hono untuk HTTP framework