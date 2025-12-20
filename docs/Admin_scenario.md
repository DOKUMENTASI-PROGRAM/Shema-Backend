# Scenario Lengkap Admin: Penggunaan Fitur dan Tugas Admin di Shema Music

## Overview

Dokumentasi ini menjelaskan **scenario lengkap** dari sisi frontend (admin) dalam melakukan semua tugas dan penggunaan fitur untuk admin di platform Shema Music. Scenario dituliskan per langkah dalam bentuk tekstual, dengan menyertakan endpoint API lengkap beserta request body dan response yang riil.

### Arsitektur Sistem

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin UI      │    │  API Gateway    │    │  Admin Service  │
│                 │────│                 │────│                 │
│ - Dashboard     │    │ - Routing       │    │ - User Mgmt     │
│ - Management    │    │ - Auth          │    │ - Course Mgmt   │
│ - Scheduling    │    │ - Load Balance  │    │ - Schedule Mgmt │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Database      │
                    │   (Supabase)    │
                    │                 │
                    │ - Users         │
                    │ - Courses       │
                    │ - Rooms         │
                    │ - Schedules     │
                    │ - Bookings      │
                    └─────────────────┘
```

### Services Yang Terlibat

- **Admin Service** (`admin/`): Pusat kontrol admin operations
- **Auth Service** (`auth/`): User management dan authentication
- **Course Service** (`course/`): Course dan instruktur management
- **Booking Service** (`booking/`): Schedule dan availability management
- **API Gateway** (`api-gateway/`): Routing dan orchestration

## Prerequisites

### Akses Admin

1. **Login sebagai Admin**

   ```
   Email: k423@gmail.com
   Password: Kiana423
   ```

2. **API Base URL**

   ```
   Development: http://localhost:3000/api/admin
   Production: https://api.shemamusic.com/api/admin
   ```

3. **Authentication**
   - Semua endpoint admin memerlukan `Authorization: Bearer <token>`
   - Token didapat dari login admin

## Scenario Lengkap: Semua Tugas dan Fitur Admin

### Scenario 1: Login ke Sistem Admin

**Langkah 1.1: Akses halaman login admin**

- Admin membuka aplikasi frontend admin
- Navigasi ke halaman login

**Langkah 1.2: Masukkan kredensial dan login**

- Input email: k423@gmail.com
- Input password: Kiana423
- Klik tombol "Login"

**Endpoint API yang dipanggil:**

```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "k423@gmail.com",
  "password": "Kiana423"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": null,
    "user": {
      "id": "uuid-admin",
      "email": "k423@gmail.com",
      "full_name": "Admin User",
      "role": "admin",
      "phone_number": null,
      "avatar_url": null,
      "created_at": "2025-11-26T09:00:00Z",
      "updated_at": "2025-11-26T09:00:00Z",
      "last_login_at": "2025-11-26T10:00:00Z"
    }
  },
  "meta": {
    "timestamp": "2025-11-26T10:00:00Z"
  }
}
```

**Langkah 1.3: Redirect ke dashboard**

- Setelah login berhasil, frontend menyimpan token
- Redirect ke halaman dashboard admin

### Scenario 2: Melihat Dashboard dan Statistik

**Langkah 2.1: Akses dashboard**

- Dari halaman utama admin, klik menu "Dashboard"

**Endpoint API yang dipanggil:**

```
GET http://localhost:3000/api/admin/dashboard
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "total_users": 150,
    "total_courses": 25,
    "total_bookings": 89,
    "active_bookings": 45,
    "revenue_this_month": 2500000,
    "recent_activities": [
      {
        "type": "booking_confirmed",
        "message": "Booking #123 confirmed",
        "timestamp": "2025-11-26T10:00:00Z"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-11-26T10:00:00Z"
  }
}
```

**Langkah 2.2: Review statistik**

- Frontend menampilkan statistik total users, courses, bookings
- Admin dapat melihat revenue dan aktivitas terbaru

### Scenario 3: Mengelola Pengguna (Users Management)

**Langkah 3.1: Melihat daftar semua pengguna**

- Klik menu "Users" atau "User Management"

**Endpoint API yang dipanggil:**

```
GET http://localhost:3000/api/admin/users?page=1&limit=10
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-user-1",
      "email": "student@example.com",
      "full_name": "Student Name",
      "role": "student",
      "phone_number": "+628123456789",
      "created_at": "2025-11-26T09:00:00Z",
      "last_login_at": "2025-11-26T10:00:00Z"
    },
    {
      "id": "uuid-user-2",
      "email": "instructor@example.com",
      "full_name": "Instructor Name",
      "role": "instructor",
      "phone_number": "+628123456789",
      "created_at": "2025-11-26T09:00:00Z",
      "last_login_at": "2025-11-26T10:00:00Z"
    }
  ],
  "meta": {
    "timestamp": "2025-11-26T10:00:00Z",
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 150
    }
  }
}
```

**Langkah 3.2: Update informasi pengguna**

- Klik edit pada user tertentu
- Update nama atau nomor telepon

**Endpoint API yang dipanggil:**

```
PUT http://localhost:3000/api/admin/users/uuid-user-1
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "full_name": "Updated Student Name",
  "phone_number": "+628123456789"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid-user-1",
    "email": "student@example.com",
    "full_name": "Updated Student Name",
    "role": "student",
    "phone_number": "+628123456789",
    "updated_at": "2025-11-26T10:00:00Z"
  },
  "meta": {
    "timestamp": "2025-11-26T10:00:00Z"
  }
}
```

### Scenario 4: Mengelola Siswa (Students Management)

**Langkah 4.1: Melihat daftar siswa**

- Klik menu "Students"

**Endpoint API yang dipanggil:**

```
GET http://localhost:3000/api/admin/students?page=1&limit=10
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-student-1",
      "email": "student@example.com",
      "full_name": "Student Name",
      "phone_number": "+628123456789",
      "enrolled_courses": 2,
      "created_at": "2025-11-26T09:00:00Z"
    }
  ],
  "meta": {
    "timestamp": "2025-11-26T10:00:00Z",
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 150
    }
  }
}
```

**Langkah 4.2: Melihat detail siswa**

- Klik pada siswa tertentu untuk melihat detail

**Endpoint API yang dipanggil:**

```
GET http://localhost:3000/api/admin/students/uuid-student-1
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid-student-1",
    "email": "student@example.com",
    "full_name": "Student Name",
    "phone_number": "+628123456789",
    "courses": [
      {
        "course_id": "uuid-course-1",
        "course_name": "Guitar Basics",
        "status": "active"
      }
    ],
    "created_at": "2025-11-26T09:00:00Z"
  },
  "meta": {
    "timestamp": "2025-11-26T10:00:00Z"
  }
}
```

**Langkah 4.3: Membuat siswa baru**

- Klik tombol "Add Student"
- Isi form dengan email, nama, nomor telepon

**Endpoint API yang dipanggil:**

```
POST http://localhost:3000/api/admin/students
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "newstudent@example.com",
  "full_name": "New Student",
  "phone_number": "+628123456789"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid-new-student",
    "email": "newstudent@example.com",
    "full_name": "New Student",
    "created_at": "2025-11-26T10:00:00Z"
  },
  "meta": {
    "timestamp": "2025-11-26T10:00:00Z"
  }
}
```

**Langkah 4.4: Update siswa**

- Edit informasi siswa

**Endpoint API yang dipanggil:**

```
PUT http://localhost:3000/api/admin/students/uuid-student-1
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "full_name": "Updated Student Name",
  "phone_number": "+628123456789"
}
```

**Langkah 4.5: Hapus siswa**

- Klik delete pada siswa tertentu

**Endpoint API yang dipanggil:**

```
DELETE http://localhost:3000/api/admin/students/uuid-student-1
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Student deleted successfully"
  },
  "meta": {
    "timestamp": "2025-11-26T10:00:00Z"
  }
}
```

### Scenario 5: Mengelola Kursus (Courses Management)

**Langkah 5.1: Melihat daftar kursus**

- Klik menu "Courses"

**Endpoint API yang dipanggil:**

```
GET http://localhost:3000/api/admin/courses
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-course-1",
      "title": "Guitar Basics",
      "instructor_name": "Jane Smith",
      "level": "beginner",
      "price_per_session": 50000,
      "is_active": true,
      "total_students": 15,
      "created_at": "2025-11-26T09:00:00Z"
    }
  ],
  "meta": {
    "timestamp": "2025-11-26T10:00:00Z"
  }
}
```

### Scenario 6: Mengelola Booking (Bookings Management)

**Langkah 6.1: Melihat daftar booking**

- Klik menu "Bookings"

**Endpoint API yang dipanggil:**

```
GET http://localhost:3000/api/admin/bookings
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-booking-1",
      "student_id": "uuid-student-1",
      "course_id": "uuid-course-1",
      "status": "pending",
      "created_at": "2025-11-26T10:00:00Z"
    }
  ],
  "meta": {
    "timestamp": "2025-11-26T10:00:00Z"
  }
}
```

**Langkah 6.2: Konfirmasi booking**

- Klik confirm pada booking pending

**Endpoint API yang dipanggil:**

```
POST http://localhost:3000/api/booking/uuid-booking-1/confirm
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "booking_id": "uuid-booking-1",
    "status": "confirmed",
    "message": "Booking confirmed successfully"
  },
  "meta": {
    "timestamp": "2025-11-26T10:00:00Z"
  }
}
```

**Langkah 6.3: Assign slot ke booking**

- Pilih slot yang tersedia untuk booking

**Endpoint API yang dipanggil:**

```
POST http://localhost:3000/api/booking/admin/bookings/uuid-booking-1/assign-slot
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "slot_id": "uuid-slot-1"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "booking_id": "uuid-booking-1",
    "slot_id": "uuid-slot-1",
    "message": "Slot assigned successfully"
  },
  "meta": {
    "timestamp": "2025-11-26T10:00:00Z"
  }
}
```

### Scenario 7: Mengelola Instructor (Instructor Management)

**Langkah 7.1: Melihat daftar instruktur**

- Klik menu "Instructors"

**Endpoint API yang dipanggil:**

```
GET http://localhost:3000/api/admin/instructor?page=1&limit=10
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "instructors": [
      {
        "user_id": "uuid-instructor-1",
        "full_name": "Jane Smith",
        "email": "instructor@example.com",
        "wa_number": "+628123456789",
        "bio": "Experienced music instructor",
        "specialization": "Guitar, Piano",
        "created_at": "2025-12-02T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

**Langkah 7.2: Melihat detail instruktur**

- Klik pada instruktur tertentu untuk melihat detail

**Endpoint API yang dipanggil:**

```
GET http://localhost:3000/api/admin/instructor/uuid-instructor-1
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user_id": "uuid-instructor-1",
    "full_name": "Jane Smith",
    "email": "instructor@example.com",
    "wa_number": "+628123456789",
    "bio": "Experienced music instructor",
    "specialization": "Guitar, Piano",
    "created_at": "2025-12-02T10:00:00Z",
    "user": {
      "id": "uuid-instructor-1",
      "email": "instructor@example.com",
      "role": "instructor",
      "phone_number": "+628123456789"
    }
  }
}
```

**Langkah 7.3: Buat instruktur baru**

- Klik menu "Create Instructor"
- Isi form dengan detail instruktur

**Endpoint API yang dipanggil:**

```
POST http://localhost:3000/api/admin/instructor
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "newinstructor@example.com",
  "full_name": "Jane Smith",
  "phone_number": "+628123456789",
  "wa_number": "+628123456789",
  "bio": "Experienced music instructor",
  "specialization": "Guitar, Piano"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-instructor",
      "email": "newinstructor@example.com",
      "full_name": "Jane Smith",
      "role": "instructor"
    },
    "profile": {
      "user_id": "uuid-instructor",
      "full_name": "Jane Smith",
      "email": "newinstructor@example.com",
      "wa_number": "+628123456789",
      "bio": "Experienced music instructor",
      "specialization": "Guitar, Piano",
      "created_at": "2025-12-02T10:00:00Z"
    },
    "message": "Instructor created successfully"
  }
}
```

**Langkah 7.4: Update instruktur**

- Klik edit pada instruktur tertentu
- Update informasi yang diperlukan

**Endpoint API yang dipanggil:**

```
PUT http://localhost:3000/api/admin/instructor/uuid-instructor-1
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "full_name": "Jane Smith Updated",
  "bio": "Updated bio - Senior music instructor",
  "specialization": "Guitar, Piano, Violin"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user_id": "uuid-instructor-1",
    "full_name": "Jane Smith Updated",
    "email": "instructor@example.com",
    "bio": "Updated bio - Senior music instructor",
    "specialization": "Guitar, Piano, Violin",
    "updated_at": "2025-12-02T11:00:00Z"
  }
}
```

**Langkah 7.5: Hapus instruktur**

- Klik delete pada instruktur tertentu

**Endpoint API yang dipanggil:**

```
DELETE http://localhost:3000/api/admin/instructor/uuid-instructor-1
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Instructor deleted successfully"
  }
}
```

### Scenario 8: Penjadwalan Instructor untuk Course (Assign Instructor)

**Langkah 8.1: Buat kursus baru**

- Klik menu "Create Course"
- Isi detail kursus

**Endpoint API yang dipanggil:**

```
POST http://localhost:3000/api/courses
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Guitar Basics",
  "description": "Learn basic guitar skills",
  "instrument": "guitar",
  "level": "beginner",
  "price_per_session": 50000,
  "duration_minutes": 60,
  "max_students": 10
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid-course-1",
    "title": "Guitar Basics",
    "description": "Learn basic guitar skills",
    "level": "beginner",
    "price_per_session": 50000,
    "duration_minutes": 60,
    "max_students": 10,
    "instrument": "guitar",
    "is_active": true,
    "created_at": "2025-11-26T10:00:00Z"
  },
  "meta": {
    "timestamp": "2025-11-26T10:00:00Z"
  }
}
```

**Langkah 8.2: Assign ruang untuk kursus**

- Pilih ruang yang tersedia

**Endpoint API yang dipanggil:**

```
POST http://localhost:3000/api/booking/admin/assign-room
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "course_id": "uuid-course-1",
  "room_id": "uuid-room-1",
  "schedule": {
    "days": ["monday", "wednesday"],
    "time": "19:00",
    "duration": 60
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "course_id": "uuid-course-1",
    "room_id": "uuid-room-1",
    "slots_created": 8,
    "message": "Room assigned and slots created successfully"
  },
  "meta": {
    "timestamp": "2025-11-26T10:00:00Z"
  }
}
```

**Langkah 8.3: Monitor pendaftaran siswa**

- Lihat booking yang masuk untuk kursus tersebut

**Endpoint API yang dipanggil:**

```
GET http://localhost:3000/api/booking/admin/bookings/pending
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-booking-1",
      "student_id": "uuid-student-1",
      "course_id": "uuid-course-1",
      "status": "pending",
      "created_at": "2025-11-26T10:00:00Z"
    }
  ],
  "meta": {
    "timestamp": "2025-11-26T10:00:00Z",
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25
    }
  }
}
```

**Langkah 8.4: Konfirmasi dan assign slot untuk siswa**

- Konfirmasi booking dan assign slot

**Endpoint API yang dipanggil:**

```
POST http://localhost:3000/api/booking/uuid-booking-1/confirm
Authorization: Bearer <admin_token>
```

Kemudian assign slot:

```
POST http://localhost:3000/api/booking/admin/bookings/uuid-booking-1/assign-slot
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "slot_id": "uuid-slot-1"
}
```

### Scenario 9: Monitoring dan Reporting

**Langkah 9.1: Melihat laporan aktivitas**

- Akses halaman reports atau logs

**Endpoint API yang dipanggil:**

```
GET http://localhost:3000/api/admin/reports/activities?date_from=2025-11-01&date_to=2025-11-30
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "total_activities": 150,
    "activities": [
      {
        "type": "course_created",
        "description": "Course 'Guitar Basics' created",
        "timestamp": "2025-11-26T10:00:00Z"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-11-26T10:00:00Z"
  }
}
```

**Langkah 9.2: Melihat statistik revenue**

- Dari dashboard, lihat revenue bulanan

**Endpoint API yang dipanggil:**

```
GET http://localhost:3000/api/admin/reports/revenue?month=11&year=2025
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "total_revenue": 2500000,
    "total_sessions": 50,
    "average_session_price": 50000,
    "monthly_breakdown": {
      "2025-11": 2500000
    }
  },
  "meta": {
    "timestamp": "2025-11-26T10:00:00Z"
  }
}
```

### Scenario 10: Logout dari Sistem

**Langkah 10.1: Logout**

- Klik tombol logout di header admin

**Endpoint API yang dipanggil:**

```
POST http://localhost:3000/api/auth/logout
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully. Please sign out from Firebase SDK."
  },
  "meta": {
    "timestamp": "2025-11-26T10:00:00Z"
  }
}
```

**Langkah 10.2: Redirect ke halaman login**

- Frontend menghapus token dan redirect ke login page

---

_Dokumentasi scenario admin diperbarui pada: December 2, 2025_

_Scenario ini mencakup semua tugas dan fungsi admin yang tersedia di sistem Shema Music, termasuk login, dashboard, user management, student management, course management, booking management, instructor management (CRUD), instructor assignment, dan monitoring/reporting._
