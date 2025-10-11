# API Endpoints Documentation

## Overview

Dokumentasi lengkap untuk semua endpoint API di backend Shema Music.

**Base URL**: `http://localhost:3000` (API Gateway)

**System Architecture**:
- 🔐 **Admin Only Authentication** - Hanya admin yang punya akses login untuk dashboard
- 👥 **No User Accounts** - Siswa dan guru tidak perlu membuat akun/login
- 📝 **Public Registration** - Data siswa diambil saat mendaftar course via public form
- 📊 **Admin Dashboard** - Admin manage data siswa, guru, jadwal, dan course

**Authentication** (Admin Dashboard only): 
```
Authorization: Bearer <admin_access_token>
```

**Public Endpoints**: Endpoint untuk pendaftaran course, melihat jadwal, dan chat adalah **PUBLIC** (tidak perlu authentication)

**Response Format Standard**:
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Success message"
}
```

**Error Format Standard**:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { /* optional additional info */ }
}

---

## 1. API Gateway Endpoints

**Base Path**: `/api`

### 1.1 Health Check
**GET** `/health`
- **Description**: Check API Gateway status
- **Authentication**: None
- **Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-09T12:00:00Z",
  "services": {
    "auth": "up",
    "user": "up",
    "course": "up",
    "booking": "up",
    "chat": "up",
    "recommendation": "up"
  }
}
```

### 1.2 Admin Dashboard Aggregation
**GET** `/api/admin/dashboard`
- **Description**: Get aggregated data untuk admin dashboard
- **Authentication**: Required (Admin only)
- **Response**:
```json
{
  "stats": {
    "total_students": 150,
    "total_teachers": 12,
    "pending_bookings": 5,
    "active_chats": 3,
    "courses_available": 24
  },
  "pending_bookings": [ /* booking objects */ ],
  "active_sessions": [ /* chat session objects */ ],
  "recent_registrations": [ /* user objects */ ]
}
```

---

## 2. Auth Service Endpoints

**Base Path**: `/api/auth`

**Note**: Authentication **HANYA untuk Admin** yang akses dashboard. Siswa dan guru tidak memerlukan akun/login.

### 2.1 Admin Login
**POST** `/api/auth/login`
- **Description**: Login untuk admin dashboard (menggunakan email & password atau Firebase)
- **Authentication**: None
- **Request Body**:
```json
{
  "email": "admin@shemamusic.com",
  "password": "SecureAdminPass123!"
}
```
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "uuid",
      "email": "admin@shemamusic.com",
      "full_name": "Admin Shema Music",
      "role": "admin"
    },
    "tokens": {
      "access_token": "eyJhbGc...",
      "refresh_token": "eyJhbGc...",
      "expires_in": 3600
    }
  },
  "message": "Login successful"
}
```

### 2.2 Refresh Admin Token
**POST** `/api/auth/refresh`
- **Description**: Refresh expired access token menggunakan refresh token
- **Authentication**: None (tapi butuh valid refresh token)
- **Request Body**:
```json
{
  "refresh_token": "eyJhbGc..."
}
```
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "expires_in": 3600
  }
}
```

### 2.3 Admin Logout
**POST** `/api/auth/logout`
- **Description**: Logout admin dan invalidate tokens
- **Authentication**: Required (Admin)
- **Response** (200 OK):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 2.4 Get Current Admin Info
**GET** `/api/auth/me`
- **Description**: Get info admin yang sedang login
- **Authentication**: Required (Admin)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@shemamusic.com",
    "full_name": "Admin Shema Music",
    "role": "admin",
    "last_login_at": "2025-10-09T12:00:00Z"
  }
}
```

---

## 3. User Service Endpoints

**Base Path**: `/api/users`

**Note**: User (siswa) dibuat otomatis saat form pendaftaran course. Admin manage user data via dashboard.

### 3.1 Get User Profile (Public - untuk check status)
**GET** `/api/users/check`
- **Description**: **PUBLIC** - Check status pendaftaran menggunakan email atau registration number
- **Authentication**: None
- **Query Parameters**:
  - `email` (string, optional)
  - `registration_number` (string, optional)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "full_name": "Budi Santoso",
    "email": "budi@example.com",
    "enrollments": [
      {
        "registration_number": "REG-2025-10-001",
        "course_title": "Piano Basics",
        "status": "approved",
        "registration_date": "2025-10-09",
        "start_date": "2025-10-20"
      }
    ]
  }
}
```

### 3.2 Get All Students (Admin Dashboard)
**GET** `/api/users/students`
- **Description**: Get list semua student untuk dashboard admin
- **Authentication**: Required (Admin)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firebase_uid": "firebase_user_id",
    "email": "student@example.com",
    "full_name": "John Doe",
    "phone_number": "+6281234567890",
    "wa_number": "+6281234567890",
    "address": "Jl. Example No. 123",
    "role": "student",
    "email_verified": true,
    "provider": "password",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-10-09T12:00:00Z",
    "last_login_at": "2025-10-09T12:00:00Z",
    "profile": {
      "user_id": "uuid",
      "place_of_birth": "Jakarta",
      "date_of_birth": "2005-05-15",
      "school_origin": "SMA Negeri 1",
      "current_grade": "12",
      "parent_name": "John's Parent",
      "parent_phone_number": "+6281234567899"
    }
  }
}
```

### 3.2 Update Current User Profile
**PUT** `/api/users/me`
- **Description**: Update profile user yang sedang login
- **Authentication**: Required
- **Request Body** (for student):
```json
{
  "full_name": "John Updated Doe",
  "phone_number": "+6281234567890",
  "wa_number": "+6281234567890",
  "address": "Jl. New Address No. 456",
  "profile": {
    "place_of_birth": "Jakarta",
    "date_of_birth": "2005-05-15",
    "school_origin": "SMA Negeri 2",
    "current_grade": "12",
    "parent_name": "Updated Parent",
    "parent_phone_number": "+6281234567899"
  }
}
```
- **Request Body** (for instructor):
```json
{
  "full_name": "Jane Teacher Updated",
  "phone_number": "+6281234567890",
  "wa_number": "+6281234567890",
  "address": "Jl. Instructor Address",
  "profile": {
    "bio": "Experienced music instructor with 15 years...",
    "specialization": "Piano, Vocal, Music Theory"
  }
}
```
- **Response** (200 OK):
```json
{
  "success": true,
  "data": { /* updated user object with profile */ },
  "message": "Profile updated successfully"
}
```

### 3.3 Get User by ID
**GET** `/api/users/:id`
- **Description**: Get user profile by ID (Admin & Teacher only)
- **Authentication**: Required (Admin/Teacher)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": { /* user object */ }
}
```

### 3.4 Get All Students
**GET** `/api/users/students`
- **Description**: Get list semua student (dengan pagination)
- **Authentication**: Required (Admin/Teacher)
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20, max: 100)
  - `status` (string, optional: pending | active | suspended)
  - `search` (string, optional: search by name or email)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "students": [ /* array of student objects */ ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    }
  }
}
```

### 3.5 Get All Teachers
**GET** `/api/users/teachers`
- **Description**: Get list semua teacher (dengan pagination)
- **Authentication**: Required (Admin)
- **Query Parameters**: Same as Get All Students
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "teachers": [ /* array of teacher objects */ ],
    "pagination": { /* pagination info */ }
  }
}
```

### 3.6 Create Instructor Account
**POST** `/api/users/instructors`
- **Description**: Create instructor account (Admin only) - Instructor register via Firebase first, then admin create profile
- **Authentication**: Required (Admin)
- **Request Body**:
```json
{
  "firebase_uid": "firebase_instructor_uid",
  "email": "instructor@example.com",
  "full_name": "Jane Teacher",
  "phone_number": "+6281234567890",
  "wa_number": "+6281234567890",
  "address": "Jl. Instructor Address",
  "instructor_profile": {
    "bio": "Experienced piano teacher with 10 years of teaching experience. Specialized in classical and contemporary styles.",
    "specialization": "Piano, Vocal, Music Theory"
  }
}
```
- **Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "firebase_uid": "firebase_instructor_uid",
      "email": "instructor@example.com",
      "full_name": "Jane Teacher",
      "role": "instructor",
      "created_at": "2025-10-09T12:00:00Z"
    },
    "instructor_profile": {
      "user_id": "uuid",
      "bio": "Experienced piano teacher...",
      "specialization": "Piano, Vocal, Music Theory"
    }
  },
  "message": "Instructor account created successfully"
}
```

### 3.7 Update User Role
**PATCH** `/api/users/:id/role`
- **Description**: Update user role (Admin only) - untuk promote student ke instructor atau sebaliknya
- **Authentication**: Required (Admin)
- **Request Body**:
```json
{
  "role": "instructor" // student | instructor | admin
}
```
- **Response** (200 OK):
```json
{
  "success": true,
  "data": { /* updated user object */ },
  "message": "User role updated successfully"
}
```
- **Note**: Saat role diubah dari student ke instructor, system akan create `instructor_profiles` entry. Begitu juga sebaliknya untuk student.

### 3.8 Delete User
**DELETE** `/api/users/:id`
- **Description**: Soft delete user account (Admin only)
- **Authentication**: Required (Admin)
- **Response** (200 OK):
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### 3.9 Get User Statistics
**GET** `/api/users/stats`
- **Description**: Get user statistics untuk dashboard (Admin only)
- **Authentication**: Required (Admin)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "total_students": 150,
    "total_teachers": 12,
    "total_admins": 3,
    "pending_approvals": 5,
    "active_users": 145,
    "suspended_users": 3,
    "new_registrations_this_month": 12
  }
}
```

### 3.10 Get User by Email (Internal Service Call)
**GET** `/api/users/by-email`
- **Description**: Get user by email (untuk service-to-service communication)
- **Authentication**: Required (Service JWT)
- **Query Parameters**: `email` (string, required)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": { /* user object */ }
}
```

---

## 4. Course Service Endpoints

**Base Path**: `/api/courses`

### 4.1 Get All Courses (Public)
**GET** `/api/courses`
- **Description**: **PUBLIC** - Get list semua kelas aktif untuk ditampilkan di website
- **Authentication**: None (Public)
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
  - `level` (string, optional: from course_level enum - beginner | intermediate | advanced)
  - `is_active` (boolean, optional: filter active courses only)
  - `search` (string, optional: search by course title)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": "uuid",
        "title": "Piano Basics for Beginners",
        "description": "Learn fundamental piano techniques...",
        "level": "beginner",
        "price_per_session": 500000,
        "duration_minutes": 60,
        "max_students": 5,
        "is_active": true,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 24,
      "total_pages": 2
    }
  }
}
```

### 4.2 Get Course by ID (Public)
**GET** `/api/courses/:id`
- **Description**: **PUBLIC** - Get detail kelas untuk halaman detail course
- **Authentication**: None (Public)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Piano Basics for Beginners",
    "description": "Learn fundamental piano techniques including proper posture, hand positioning, reading sheet music, and basic chord progressions.",
    "level": "beginner",
    "price_per_session": 500000,
    "duration_minutes": 60,
    "max_students": 5,
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z",
    "upcoming_schedules": [
      {
        "id": "uuid",
        "start_time": "2025-10-15T10:00:00Z",
        "end_time": "2025-10-15T11:00:00Z",
        "instructor": {
          "id": "uuid",
          "full_name": "Jane Teacher",
          "bio": "Experienced piano teacher...",
          "specialization": "Piano, Music Theory"
        },
        "room": {
          "id": "uuid",
          "name": "Room A",
          "capacity": 10
        },
        "enrolled_students": 3,
        "available_slots": 2
      }
    ]
  }
}
```

### 4.3 Create Course
**POST** `/api/courses`
- **Description**: Create kelas baru (Admin only)
- **Authentication**: Required (Admin)
- **Request Body**:
```json
{
  "title": "Piano Basics for Beginners",
  "description": "Learn fundamental piano techniques including proper posture, hand positioning, reading sheet music, and basic chord progressions.",
  "level": "beginner",
  "price_per_session": 500000,
  "duration_minutes": 60,
  "max_students": 5,
  "is_active": true
}
```
- **Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Piano Basics for Beginners",
    "description": "Learn fundamental piano techniques...",
    "level": "beginner",
    "price_per_session": 500000,
    "duration_minutes": 60,
    "max_students": 5,
    "is_active": true,
    "created_at": "2025-10-09T12:00:00Z",
    "updated_at": "2025-10-09T12:00:00Z"
  },
  "message": "Course created successfully"
}
```

### 4.4 Update Course
**PUT** `/api/courses/:id`
- **Description**: Update kelas (Admin only)
- **Authentication**: Required (Admin)
- **Request Body**: Same as Create Course
- **Response** (200 OK):
```json
{
  "success": true,
  "data": { /* updated course object */ },
  "message": "Course updated successfully"
}
```

### 4.5 Delete Course
**DELETE** `/api/courses/:id`
- **Description**: Delete kelas (Admin only)
- **Authentication**: Required (Admin)
- **Response** (200 OK):
```json
{
  "success": true,
  "message": "Course deleted successfully"
}
```

### 4.6 Get Class Schedules
**GET** `/api/schedules`
- **Description**: Get jadwal kelas dengan filter
- **Authentication**: Required
- **Query Parameters**:
  - `course_id` (uuid, optional: filter by course)
  - `instructor_id` (uuid, optional: filter by instructor)
  - `room_id` (uuid, optional: filter by room)
  - `start_date` (ISO datetime, optional: filter schedules >= start_date)
  - `end_date` (ISO datetime, optional: filter schedules <= end_date)
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "schedules": [
      {
        "id": "uuid",
        "course": {
          "id": "uuid",
          "title": "Piano Basics for Beginners",
          "level": "beginner"
        },
        "instructor": {
          "id": "uuid",
          "full_name": "Jane Teacher"
        },
        "room": {
          "id": "uuid",
          "name": "Room A",
          "capacity": 10
        },
        "start_time": "2025-10-15T10:00:00Z",
        "end_time": "2025-10-15T11:00:00Z",
        "enrolled_count": 3,
        "max_students": 5,
        "created_at": "2025-10-01T00:00:00Z"
      }
    ],
    "pagination": { /* pagination info */ }
  }
}
```

### 4.7 Get Schedule by ID
**GET** `/api/schedules/:id`
- **Description**: Get detail schedule dengan list attendees
- **Authentication**: Required
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "course": { /* course details */ },
    "instructor": { /* instructor details */ },
    "room": { /* room details */ },
    "start_time": "2025-10-15T10:00:00Z",
    "end_time": "2025-10-15T11:00:00Z",
    "attendees": [
      {
        "student": {
          "id": "uuid",
          "full_name": "John Doe",
          "email": "student@example.com"
        },
        "attended": true
      }
    ],
    "enrolled_count": 3,
    "max_students": 5
  }
}
```

### 4.8 Create Schedule
**POST** `/api/schedules`
- **Description**: Create jadwal baru untuk kelas (Admin/Instructor)
- **Authentication**: Required (Admin/Instructor)
- **Request Body**:
```json
{
  "course_id": "uuid",
  "instructor_id": "uuid",
  "room_id": "uuid",
  "start_time": "2025-10-15T10:00:00Z",
  "end_time": "2025-10-15T11:00:00Z"
}
```
- **Validation**:
  - Instructor dan room tidak boleh double-booked di waktu yang sama
  - start_time < end_time
  - Course harus aktif
- **Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "course_id": "uuid",
    "instructor_id": "uuid",
    "room_id": "uuid",
    "start_time": "2025-10-15T10:00:00Z",
    "end_time": "2025-10-15T11:00:00Z",
    "created_at": "2025-10-09T12:00:00Z"
  },
  "message": "Schedule created successfully"
}
```

### 4.9 Update Schedule
**PUT** `/api/schedules/:id`
- **Description**: Update jadwal (Admin/Instructor)
- **Authentication**: Required (Admin/Instructor)
- **Request Body**: Same as Create Schedule
- **Response** (200 OK):
```json
{
  "success": true,
  "data": { /* updated schedule */ },
  "message": "Schedule updated successfully"
}
```

### 4.10 Delete Schedule
**DELETE** `/api/schedules/:id`
- **Description**: Delete jadwal (Admin only)
- **Authentication**: Required (Admin)
- **Response** (200 OK):
```json
{
  "success": true,
  "message": "Schedule deleted successfully"
}
```

### 4.11 Get Course Statistics
**GET** `/api/courses/stats`
- **Description**: Get course statistics (Admin only)
- **Authentication**: Required (Admin)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "total_courses": 24,
    "active_courses": 20,
    "inactive_courses": 4,
    "courses_by_level": {
      "beginner": 12,
      "intermediate": 8,
      "advanced": 4
    },
    "total_enrollments": 150,
    "most_popular_courses": [
      {
        "course_id": "uuid",
        "title": "Piano Basics",
        "enrollment_count": 25
      }
    ]
  }
}
```

---

## 4A. Room Management Endpoints

**Base Path**: `/api/rooms`

### 4A.1 Get All Rooms
**GET** `/api/rooms`
- **Description**: Get list semua ruangan
- **Authentication**: Required
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": "uuid",
        "name": "Room A",
        "capacity": 10,
        "description": "Large room with piano and drum set",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": { /* pagination info */ }
  }
}
```

### 4A.2 Get Room by ID
**GET** `/api/rooms/:id`
- **Description**: Get detail ruangan dengan upcoming schedules
- **Authentication**: Required
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Room A",
    "capacity": 10,
    "description": "Large room with piano and drum set",
    "upcoming_schedules": [
      {
        "id": "uuid",
        "course_title": "Piano Basics",
        "start_time": "2025-10-15T10:00:00Z",
        "end_time": "2025-10-15T11:00:00Z",
        "instructor_name": "Jane Teacher"
      }
    ]
  }
}
```

### 4A.3 Create Room
**POST** `/api/rooms`
- **Description**: Create ruangan baru (Admin only)
- **Authentication**: Required (Admin)
- **Request Body**:
```json
{
  "name": "Room B",
  "capacity": 8,
  "description": "Medium-sized room with vocal equipment"
}
```
- **Response** (201 Created):
```json
{
  "success": true,
  "data": { /* room object */ },
  "message": "Room created successfully"
}
```

### 4A.4 Update Room
**PUT** `/api/rooms/:id`
- **Description**: Update ruangan (Admin only)
- **Authentication**: Required (Admin)
- **Request Body**: Same as Create Room
- **Response** (200 OK):
```json
{
  "success": true,
  "data": { /* updated room */ },
  "message": "Room updated successfully"
}
```

### 4A.5 Delete Room
**DELETE** `/api/rooms/:id`
- **Description**: Delete ruangan (Admin only)
- **Authentication**: Required (Admin)
- **Response** (200 OK):
```json
{
  "success": true,
  "message": "Room deleted successfully"
}
```

---

## 4B. Attendance Management Endpoints

**Base Path**: `/api/attendance`

### 4B.1 Mark Attendance
**POST** `/api/attendance`
- **Description**: Mark kehadiran student di schedule tertentu (Instructor/Admin)
- **Authentication**: Required (Instructor/Admin)
- **Request Body**:
```json
{
  "class_schedule_id": "uuid",
  "student_id": "uuid",
  "attended": true
}
```
- **Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "class_schedule_id": "uuid",
    "student_id": "uuid",
    "attended": true,
    "created_at": "2025-10-15T10:30:00Z"
  },
  "message": "Attendance marked successfully"
}
```

### 4B.2 Update Attendance
**PUT** `/api/attendance/:scheduleId/:studentId`
- **Description**: Update status kehadiran (Instructor/Admin)
- **Authentication**: Required (Instructor/Admin)
- **Request Body**:
```json
{
  "attended": false
}
```
- **Response** (200 OK):
```json
{
  "success": true,
  "data": { /* updated attendance */ },
  "message": "Attendance updated successfully"
}
```

### 4B.3 Get Attendance by Schedule
**GET** `/api/attendance/schedule/:scheduleId`
- **Description**: Get daftar kehadiran untuk schedule tertentu
- **Authentication**: Required (Instructor/Admin)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "schedule": {
      "id": "uuid",
      "course_title": "Piano Basics",
      "start_time": "2025-10-15T10:00:00Z"
    },
    "attendees": [
      {
        "student": {
          "id": "uuid",
          "full_name": "John Doe",
          "email": "student@example.com"
        },
        "attended": true,
        "marked_at": "2025-10-15T10:30:00Z"
      }
    ],
    "total_enrolled": 5,
    "total_attended": 4
  }
}
```

### 4B.4 Get Student Attendance History
**GET** `/api/attendance/student/:studentId`
- **Description**: Get riwayat kehadiran student
- **Authentication**: Required (owner, Instructor, or Admin)
- **Query Parameters**:
  - `course_id` (uuid, optional)
  - `start_date` (ISO date, optional)
  - `end_date` (ISO date, optional)
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "uuid",
      "full_name": "John Doe"
    },
    "attendance_records": [
      {
        "schedule": {
          "id": "uuid",
          "course_title": "Piano Basics",
          "start_time": "2025-10-15T10:00:00Z"
        },
        "attended": true,
        "marked_at": "2025-10-15T10:30:00Z"
      }
    ],
    "summary": {
      "total_classes": 10,
      "attended": 8,
      "absent": 2,
      "attendance_rate": 0.8
    },
    "pagination": { /* pagination info */ }
  }
}
```

---

## 5. Enrollment Service Endpoints

**Base Path**: `/api/enrollments`

**Note**: Sistem menggunakan **Enrollment** model, bukan booking dengan 2 slot pilihan. Student langsung enroll ke course dan statusnya di-manage oleh admin.

### 5.1 Create Enrollment (Public Registration Form)
**POST** `/api/enrollments`
- **Description**: **PUBLIC ENDPOINT** - Form pendaftaran course untuk calon siswa (tidak perlu login)
- **Authentication**: None (Public)
- **Request Body**:
```json
{
  "full_name": "Budi Santoso",
  "wa_number": "+6281234567890",
  "email": "budi@example.com",
  "course_id": "6f7a9c8e-2f3a-4a77-9b0a-2f0e8b8c1234",
  "experience_level": "beginner",
  "time_preferences": "Weekend pagi, Sabtu 09:00-11:00",
  "preferred_days": ["saturday", "sunday"],
  "preferred_time_range": {
    "start": "09:00",
    "end": "11:00"
  },
  "start_date_target": "2025-10-20",
  "guardian": {
    "name": "Ibu Rina",
    "wa_number": "+628111111111"
  },
  "instrument_owned": true,
  "notes": "Kalau bisa jangan bentrok pramuka.",
  "referral_source": "instagram",
  "consent": true,
  "captcha_token": "turnstile-or-recaptcha-token",
  "idempotency_key": "2cfae3c1-1f77-4a83-b0d7-efc1b3d5a0c8"
}
```
- **Validation Rules**:
  - Course harus aktif (is_active = true)
  - Valid captcha token (Turnstile/reCAPTCHA)
  - consent harus true
  - Idempotency key untuk prevent duplicate submission
  - Email dan WA number valid format
- **Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "enrollment_id": "uuid",
    "registration_number": "REG-2025-10-001",
    "student_data": {
      "full_name": "Budi Santoso",
      "wa_number": "+6281234567890",
      "email": "budi@example.com"
    },
    "course": {
      "id": "6f7a9c8e-2f3a-4a77-9b0a-2f0e8b8c1234",
      "title": "Piano Basics for Beginners",
      "level": "beginner",
      "price_per_session": 500000
    },
    "status": "pending",
    "registration_date": "2025-10-09T12:00:00Z",
    "next_steps": [
      "Admin akan menghubungi Anda via WhatsApp dalam 1x24 jam",
      "Cek email untuk konfirmasi pendaftaran",
      "Siapkan alat musik (jika sudah punya)"
    ]
  },
  "message": "Pendaftaran berhasil! Kami akan menghubungi Anda segera."
}
```

**Note**: 
- Endpoint ini create user baru di `users` table dengan role `student` jika email belum exist
- Semua data preferensi (time_preferences, preferred_days, dll) disimpan di `enrollments` table atau JSONB field
- Guardian info disimpan di `student_profiles` table
- Idempotency key prevent duplicate submission dalam 24 jam

### 5.2 Get My Enrollments
**GET** `/api/enrollments/me`
- **Description**: Get semua enrollment milik student yang login
- **Authentication**: Required (Student)
- **Query Parameters**:
  - `status` (string, optional: pending | approved | rejected | cancelled)
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "enrollments": [
      {
        "id": "uuid",
        "course": {
          "id": "uuid",
          "title": "Piano Basics for Beginners",
          "level": "beginner",
          "price_per_session": 500000,
          "duration_minutes": 60
        },
        "registration_date": "2025-10-09T12:00:00Z",
        "status": "approved",
        "created_at": "2025-10-09T12:00:00Z",
        "updated_at": "2025-10-09T15:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

### 5.3 Get Enrollment by ID
**GET** `/api/enrollments/:id`
- **Description**: Get detail enrollment by ID
- **Authentication**: Required (owner atau Admin/Instructor)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "student": {
      "id": "uuid",
      "full_name": "John Doe",
      "email": "student@example.com",
      "phone_number": "+6281234567890"
    },
    "course": {
      "id": "uuid",
      "title": "Piano Basics for Beginners",
      "level": "beginner",
      "price_per_session": 500000
    },
    "registration_date": "2025-10-09T12:00:00Z",
    "status": "approved",
    "created_at": "2025-10-09T12:00:00Z",
    "updated_at": "2025-10-09T15:00:00Z"
  }
}
```

### 5.4 Get All Enrollments (Admin/Instructor)
**GET** `/api/enrollments`
- **Description**: Get semua enrollment dengan filter (Admin/Instructor)
- **Authentication**: Required (Admin/Instructor)
- **Query Parameters**:
  - `status` (string, optional: pending | approved | rejected | cancelled)
  - `course_id` (uuid, optional: filter by course)
  - `student_id` (uuid, optional: filter by student)
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "enrollments": [
      {
        "id": "uuid",
        "student": { /* student details */ },
        "course": { /* course details */ },
        "registration_date": "2025-10-09T12:00:00Z",
        "status": "pending"
      }
    ],
    "pagination": { /* pagination info */ }
  }
}
```

### 5.5 Approve Enrollment
**POST** `/api/enrollments/:id/approve`
- **Description**: Approve enrollment (Admin)
- **Authentication**: Required (Admin)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "approved",
    "updated_at": "2025-10-09T15:00:00Z"
  },
  "message": "Enrollment approved successfully"
}
```
- **Actions**:
  1. Update enrollment: `status='approved'`
  2. Publish Redis event: `enrollment.approved`
  3. Send notification to student

### 5.6 Reject Enrollment
**POST** `/api/enrollments/:id/reject`
- **Description**: Reject enrollment (Admin)
- **Authentication**: Required (Admin)
- **Request Body** (optional):
```json
{
  "reason": "Course is full"
}
```
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "rejected",
    "updated_at": "2025-10-09T15:00:00Z"
  },
  "message": "Enrollment rejected"
}
```
- **Actions**:
  1. Update enrollment: `status='rejected'`
  2. Publish Redis event: `enrollment.rejected`
  3. Send notification to student

### 5.7 Cancel Enrollment
**POST** `/api/enrollments/:id/cancel`
- **Description**: Cancel enrollment oleh student (sebelum approved atau setelah approved)
- **Authentication**: Required (owner or Admin)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "cancelled",
    "updated_at": "2025-10-09T15:00:00Z"
  },
  "message": "Enrollment cancelled successfully"
}
```

### 5.8 Get Booking Statistics
**GET** `/api/bookings/stats`
- **Description**: Get booking statistics (Admin)
- **Authentication**: Required (Admin)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "total_bookings": 250,
    "pending_bookings": 5,
    "confirmed_bookings": 200,
    "rejected_bookings": 30,
    "expired_bookings": 15,
    "bookings_this_month": 25,
    "bookings_by_instrument": { /* breakdown */ }
  }
}
```

### 5.9 Get Expired Bookings (Internal Cron)
**GET** `/api/bookings/expired`
- **Description**: Get bookings yang sudah expired (untuk auto-reject background job)
- **Authentication**: Required (Service JWT)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "expired_bookings": [ /* array of booking IDs */ ]
  }
}
```

---

## 6. Chat Service Endpoints

**Base Path**: `/api/chat`

### 6.1 WebSocket Connection (Public)
**WebSocket** `/api/chat/connect`
- **Description**: **PUBLIC** - Establish WebSocket connection untuk live chat tanpa perlu login
- **Authentication**: None (Public)
- **Connection Flow**:
  1. Client connect: `ws://localhost:3000/api/chat/connect?name=Budi&email=budi@example.com`
  2. Server authenticate & create/retrieve session
  3. Server subscribe to Redis channel: `chat:session:{sessionId}`
  4. Connection established

**WebSocket Events (Client → Server)**:
```json
{
  "type": "send_message",
  "data": {
    "content": "Halo, saya mau tanya tentang kelas piano"
  }
}
```

**WebSocket Events (Server → Client)**:
```json
{
  "type": "new_message",
  "data": {
    "id": "uuid",
    "session_id": "uuid",
    "role": "user",
    "content": "Halo, saya mau tanya tentang kelas piano",
    "created_at": "2025-10-09T12:00:00Z"
  }
}
```

**Note**: Chat messages menggunakan role: `user` (student), `assistant` (admin/instructor), `system` (automated messages)

```json
{
  "type": "message_delivered",
  "data": {
    "message_id": "uuid",
    "delivered_at": "2025-10-09T12:00:01Z"
  }
}
```

```json
{
  "type": "session_closed",
  "data": {
    "reason": "User disconnected",
    "closed_at": "2025-10-09T13:00:00Z"
  }
}
```

### 6.2 Get Chat Sessions (Admin)
**GET** `/api/chat/sessions`
- **Description**: Get all chat sessions (Admin/Instructor)
- **Authentication**: Required (Admin/Instructor)
- **Query Parameters**:
  - `user_id` (uuid, optional: filter by user)
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "user": {
          "id": "uuid",
          "full_name": "John Doe",
          "email": "student@example.com"
        },
        "started_at": "2025-10-09T12:00:00Z",
        "metadata": {
          "last_message": "Terima kasih atas infonya",
          "message_count": 12
        }
      }
    ],
    "pagination": { /* pagination info */ }
  }
}
```

### 6.3 Get Chat Session by ID
**GET** `/api/chat/sessions/:id`
- **Description**: Get detail session dengan history messages
- **Authentication**: Required (owner atau Admin/Instructor)
- **Query Parameters**:
  - `limit` (integer, optional: limit messages returned, default: 50)
  - `offset` (integer, optional: offset for pagination, default: 0)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user": {
      "id": "uuid",
      "full_name": "John Doe",
      "email": "student@example.com"
    },
    "started_at": "2025-10-09T12:00:00Z",
    "metadata": {
      "topic": "Piano course inquiry",
      "tags": ["course", "piano"]
    },
    "messages": [
      {
        "id": "uuid",
        "session_id": "uuid",
        "role": "user",
        "content": "Halo, saya mau tanya tentang kelas piano",
        "created_at": "2025-10-09T12:00:00Z"
      },
      {
        "id": "uuid",
        "session_id": "uuid",
        "role": "assistant",
        "content": "Halo, ada yang bisa saya bantu?",
        "created_at": "2025-10-09T12:01:00Z"
      },
      {
        "id": "uuid",
        "session_id": "uuid",
        "role": "system",
        "content": "Session started",
        "created_at": "2025-10-09T11:59:59Z"
      }
    ],
    "total_messages": 25
  }
}
```

### 6.4 Get My Chat Sessions
**GET** `/api/chat/sessions/me`
- **Description**: Get chat sessions milik user yang login
- **Authentication**: Required
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "sessions": [ /* array of user's chat sessions */ ]
  }
}
```

### 6.5 Update Session Metadata
**PATCH** `/api/chat/sessions/:id`
- **Description**: Update session metadata (Admin/Instructor) - untuk tagging/categorization
- **Authentication**: Required (Admin/Instructor)
- **Request Body**:
```json
{
  "metadata": {
    "topic": "Piano course inquiry",
    "tags": ["course", "piano", "beginner"],
    "resolved": true
  }
}
```
- **Response** (200 OK):
```json
{
  "success": true,
  "data": { /* updated session */ },
  "message": "Session metadata updated successfully"
}
```

### 6.6 Get Chat Statistics
**GET** `/api/chat/stats`
- **Description**: Get chat statistics (Admin)
- **Authentication**: Required (Admin)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "active_sessions": 3,
    "total_sessions_today": 15,
    "total_messages_today": 120,
    "average_response_time_minutes": 5,
    "sessions_closed_today": 12
  }
}
```

---

## 7. Analytics & Reporting Endpoints

**Base Path**: `/api/analytics`

**Note**: Recommendation service will be added in future versions. Current analytics focus on enrollment and attendance data.

### 7.1 Get Course Analytics
**GET** `/api/analytics/courses/:id`
- **Description**: Get analytics untuk course tertentu (Admin/Instructor)
- **Authentication**: Required (Admin/Instructor)
- **Query Parameters**:
  - `start_date` (ISO date, optional)
  - `end_date` (ISO date, optional)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "course": {
      "id": "uuid",
      "title": "Piano Basics for Beginners",
      "level": "beginner"
    },
    "period": {
      "start_date": "2025-01-01",
      "end_date": "2025-10-09"
    },
    "stats": {
      "total_enrollments": 25,
      "approved_enrollments": 20,
      "pending_enrollments": 3,
      "rejected_enrollments": 2,
      "total_schedules": 40,
      "total_sessions_held": 35,
      "average_attendance_rate": 0.85,
      "revenue": 10000000
    },
    "enrollment_trend": [
      { "month": "2025-01", "count": 5 },
      { "month": "2025-02", "count": 8 }
    ]
  }
}
```

### 7.2 Get Student Analytics
**GET** `/api/analytics/students/:id`
- **Description**: Get analytics untuk student (owner, Admin, atau Instructor)
- **Authentication**: Required (owner/Admin/Instructor)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "uuid",
      "full_name": "John Doe"
    },
    "enrollments": {
      "total": 3,
      "active": 2,
      "completed": 1
    },
    "attendance": {
      "total_classes": 30,
      "attended": 25,
      "absent": 5,
      "attendance_rate": 0.83
    },
    "courses": [
      {
        "course_id": "uuid",
        "title": "Piano Basics",
        "enrollment_date": "2025-01-15",
        "attendance_rate": 0.85,
        "classes_attended": 12,
        "total_classes": 15
      }
    ]
  }
}
```

### 7.3 Get Instructor Analytics
**GET** `/api/analytics/instructors/:id`
- **Description**: Get analytics untuk instructor (owner, Admin)
- **Authentication**: Required (owner/Admin)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "instructor": {
      "id": "uuid",
      "full_name": "Jane Teacher"
    },
    "courses_taught": 5,
    "total_students": 45,
    "total_schedules": 120,
    "total_sessions_held": 110,
    "average_attendance_rate": 0.88,
    "rating": 4.8,
    "courses": [
      {
        "course_id": "uuid",
        "title": "Piano Basics",
        "students_enrolled": 20,
        "sessions_held": 40,
        "attendance_rate": 0.85
      }
    ]
  }
}
```

### 7.4 Get Dashboard Overview
**GET** `/api/analytics/dashboard`
- **Description**: Get overview stats untuk admin dashboard
- **Authentication**: Required (Admin)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "students": {
      "total": 150,
      "new_this_month": 12,
      "active": 135
    },
    "instructors": {
      "total": 12,
      "active": 11
    },
    "courses": {
      "total": 24,
      "active": 20
    },
    "enrollments": {
      "total": 250,
      "pending": 5,
      "approved_this_month": 18
    },
    "schedules": {
      "upcoming": 45,
      "today": 8
    },
    "attendance": {
      "overall_rate": 0.87,
      "today": 15
    },
    "revenue": {
      "total": 125000000,
      "this_month": 12500000
    }
  }
}
```

---

## Error Codes Reference

### Authentication Errors (AUTH_*)
- `AUTH_INVALID_CREDENTIALS` - Email atau password salah
- `AUTH_USER_NOT_FOUND` - User tidak ditemukan
- `AUTH_EMAIL_ALREADY_EXISTS` - Email sudah terdaftar
- `AUTH_INVALID_TOKEN` - JWT token invalid atau expired
- `AUTH_REFRESH_TOKEN_EXPIRED` - Refresh token sudah expired
- `AUTH_UNAUTHORIZED` - Tidak ada token atau token invalid
- `AUTH_FORBIDDEN` - User tidak punya akses ke resource ini
- `AUTH_PASSWORD_TOO_WEAK` - Password tidak memenuhi requirements

### Validation Errors (VALIDATION_*)
- `VALIDATION_REQUIRED_FIELD` - Field required tidak diisi
- `VALIDATION_INVALID_EMAIL` - Format email tidak valid
- `VALIDATION_INVALID_PHONE` - Format phone tidak valid
- `VALIDATION_INVALID_ENUM` - Value tidak sesuai dengan enum yang diperbolehkan
- `VALIDATION_INVALID_DATE` - Format date tidak valid

### Enrollment Errors (ENROLLMENT_*)
- `ENROLLMENT_COURSE_INACTIVE` - Course tidak aktif
- `ENROLLMENT_COURSE_FULL` - Course sudah penuh (max_students reached)
- `ENROLLMENT_ALREADY_EXISTS` - Student sudah enrolled di course ini
- `ENROLLMENT_NOT_FOUND` - Enrollment tidak ditemukan
- `ENROLLMENT_INVALID_STATUS` - Status enrollment tidak valid
- `ENROLLMENT_UNAUTHORIZED` - User tidak punya akses ke enrollment ini

### Schedule Errors (SCHEDULE_*)
- `SCHEDULE_CONFLICT` - Instructor atau room sudah booked di waktu yang sama
- `SCHEDULE_INVALID_TIME` - start_time harus sebelum end_time
- `SCHEDULE_PAST_TIME` - Tidak bisa create schedule di waktu yang sudah lewat
- `SCHEDULE_NOT_FOUND` - Schedule tidak ditemukan
- `SCHEDULE_CANNOT_DELETE` - Schedule tidak bisa dihapus (ada attendees)

### Attendance Errors (ATTENDANCE_*)
- `ATTENDANCE_ALREADY_MARKED` - Kehadiran sudah di-mark untuk student ini
- `ATTENDANCE_SCHEDULE_NOT_FOUND` - Schedule tidak ditemukan
- `ATTENDANCE_STUDENT_NOT_ENROLLED` - Student tidak enrolled di course ini
- `ATTENDANCE_INVALID_TIME` - Tidak bisa mark attendance sebelum schedule dimulai

### Database Errors (DB_*)
- `DB_CONNECTION_ERROR` - Koneksi ke database gagal
- `DB_QUERY_ERROR` - Query error
- `DB_CONSTRAINT_VIOLATION` - Constraint violation (unique, foreign key, dll)
- `DB_NOT_FOUND` - Resource tidak ditemukan

### Service Communication Errors (SERVICE_*)
- `SERVICE_UNAVAILABLE` - Service lain unavailable
- `SERVICE_TIMEOUT` - Request ke service lain timeout
- `SERVICE_INVALID_RESPONSE` - Response dari service lain tidak valid

### Chat Errors (CHAT_*)
- `CHAT_SESSION_NOT_FOUND` - Chat session tidak ditemukan
- `CHAT_SESSION_CLOSED` - Chat session sudah ditutup
- `CHAT_WEBSOCKET_ERROR` - WebSocket connection error

### Recommendation Errors (REC_*)
- `REC_NO_COURSES_AVAILABLE` - Tidak ada course yang tersedia untuk direkomendasi
- `REC_GENERATION_FAILED` - Gagal generate rekomendasi

---

## Rate Limiting

Rate limiting diterapkan di API Gateway:

**Default Limits**:
- Public endpoints: 100 requests per 15 minutes per IP
- Authenticated endpoints: 500 requests per 15 minutes per user
- Admin endpoints: 1000 requests per 15 minutes per user

**Response Header**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704892800
```

**Error Response** (429 Too Many Requests):
```json
{
  "success": false,
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "retry_after": 600 // seconds
  }
}
```

---

## Redis Pub/Sub Events

Events yang di-publish ke Redis untuk inter-service communication:

### Enrollment Events
- `enrollment.created` - Enrollment baru dibuat
- `enrollment.approved` - Enrollment diapprove
- `enrollment.rejected` - Enrollment ditolak
- `enrollment.cancelled` - Enrollment dibatalkan

### User Events
- `user.registered` - User baru register via Firebase
- `user.profile.updated` - User profile diupdate
- `user.role.changed` - User role berubah

### Schedule Events
- `schedule.created` - Schedule baru dibuat
- `schedule.updated` - Schedule diupdate
- `schedule.deleted` - Schedule dihapus
- `schedule.reminder` - Reminder 1 jam sebelum kelas

### Chat Events
- `chat.session.created` - Chat session baru
- `chat.message.sent` - Message baru terkirim

### Attendance Events
- `attendance.marked` - Kehadiran di-mark
- `attendance.summary` - Daily attendance summary

**Event Payload Format**:
```json
{
  "event_type": "enrollment.approved",
  "timestamp": "2025-10-09T12:00:00Z",
  "data": {
    "enrollment_id": "uuid",
    "student_id": "uuid",
    "course_id": "uuid"
  },
  "metadata": {
    "triggered_by": "admin_id",
    "source_service": "enrollment-service"
  }
}
```

---

## Changelog

### Version 1.0.0 (Current - October 2025)
- Initial API design based on Supabase schema
- Firebase Authentication integration
- User management (Student, Instructor, Admin)
- Course management system
- Enrollment system (replacing booking with 2-slot selection)
- Class scheduling with instructor and room assignment
- Attendance tracking system
- Room management
- Live chat with WebSocket (user/assistant/system roles)
- Analytics and reporting endpoints

### Planned for Version 1.1.0 (November 2025)
- AI-based course recommendation system
- Payment integration (optional)
- Push notifications for mobile
- Email notifications (enrollment approval, schedule reminders)
- Advanced report generation (PDF export)
- Student progress tracking
- Certificate generation
- File upload for profile pictures and course materials

### Planned for Version 1.2.0 (December 2025)
- Multi-language support (Indonesian, English)
- Advanced analytics with charts
- Instructor rating system
- Course materials management
- Video conferencing integration (for online classes)
- Mobile app API optimization

---

## Additional Notes

1. **Firebase Authentication Integration**: 
   - Backend menggunakan Firebase Admin SDK untuk verify ID tokens
   - Password management (change password, forgot password) dilakukan di Firebase
   - Backend hanya store `firebase_uid` dan sync user data ke Supabase

2. **Database Schema Notes**:
   - `users` table menggunakan `citext` type untuk email (case-insensitive)
   - `courses.level` menggunakan enum `course_level` (beginner, intermediate, advanced)
   - `enrollments.status` menggunakan enum `enrollment_status` (pending, approved, rejected, cancelled)
   - `chat_messages.role` menggunakan enum: user (student), assistant (admin/instructor), system

3. **Caching Strategy**:
   - Course catalog: 1 hour TTL
   - Schedules: 5 minutes TTL
   - User profiles: 15 minutes TTL
   - Room availability: 5 minutes TTL

4. **Database Transactions**: 
   - Operasi critical seperti enrollment approval dengan notification menggunakan transactions
   - Schedule creation dengan conflict check menggunakan row-level locking

5. **Idempotency**: 
   - POST endpoints menggunakan idempotency keys untuk handle duplicate requests
   - Update endpoints menggunakan optimistic locking dengan `updated_at` timestamp

6. **Pagination**: 
   - Semua list endpoints menggunakan offset-based pagination
   - Default limit: 20, max limit: 100 items per page

7. **Search**: 
   - Gunakan PostgreSQL full-text search untuk search di `title` dan `description`
   - Case-insensitive search menggunakan `ILIKE` operator

8. **Timezone**: 
   - Semua timestamps disimpan dalam UTC (`timestamp with time zone`)
   - Frontend convert ke local timezone (WIB/Asia/Jakarta)

9. **Validation**:
   - Phone numbers validated with Indonesian format (+62...)
   - Email validation handled by Firebase
   - Schedule conflicts checked dengan time range overlap queries

10. **Real-time Features**:
    - Chat menggunakan WebSocket untuk real-time messaging
    - Schedule updates broadcast via Redis Pub/Sub
    - Enrollment status changes trigger notifications

11. **File Storage** (Future):
    - Profile pictures akan disimpan di Supabase Storage
    - Course materials akan disimpan di Supabase Storage buckets
