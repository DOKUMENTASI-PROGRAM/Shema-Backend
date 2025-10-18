# Flow Pembuatan Course dan Penempatan Guru serta Hari

## Overview
Dokumen ini menjelaskan alur proses pembuatan course baru di sistem Shema Music, termasuk penugasan guru (instructor) dan penjadwalan hari/waktu untuk course tersebut.

## Arsitektur Sistem
- **Database**: Supabase (PostgreSQL)
- **Microservices**: Course Service (port 3003), Auth Service, Booking Service
- **Authentication**: JWT-based dengan role admin/instructor/student

## Tabel Database Terkait
### courses
```sql
- id: UUID (primary key)
- title: VARCHAR(255)
- description: TEXT
- level: ENUM (beginner/intermediate/advanced/all_levels)
- price_per_session: NUMERIC(10,2)
- duration_minutes: INTEGER
- max_students: INTEGER
- instrument: VARCHAR(100)
- is_active: BOOLEAN
- created_at, updated_at: TIMESTAMP
```

### class_schedules
```sql
- id: UUID (primary key)
- course_id: UUID (foreign key ke courses)
- instructor_id: UUID (foreign key ke auth.users)
- room_id: UUID (foreign key ke rooms)
- start_time: TIMESTAMP
- end_time: TIMESTAMP
- created_at, updated_at: TIMESTAMP
```

### instructor_profiles
```sql
- user_id: UUID (foreign key ke auth.users)
- bio: TEXT
- specialization: TEXT
- created_at, updated_at: TIMESTAMP
```

## Flow Proses Pembuatan Course

### Diagram Alur
```
Admin Login → API Gateway → Course Service
       ↓
   POST /api/courses
       ↓
Validate Request Data
       ↓
Create Course Record
       ↓
Parse Schedule String
       ↓
Create Class Schedules
       ↓
Assign Instructor
       ↓
Response Success
```

### Langkah-Langkah Detail

#### 1. Admin Authentication
- Admin login melalui Auth Service
- Mendapatkan JWT token dengan role 'admin'
- Token digunakan untuk authorize request ke Course Service

#### 2. Prepare Course Data
Data yang diperlukan untuk membuat course:
```json
{
  "title": "Piano Beginner Course",
  "description": "Kursus piano untuk pemula",
  "level": "beginner",
  "price_per_session": 150000,
  "duration_minutes": 60,
  "max_students": 10,
  "instrument": "piano",
  "schedule": "Monday 19:00-20:00, Wednesday 19:00-20:00",
  "is_active": true
}
```

#### 3. API Request
```
POST /api/courses
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

Body: <course_data>
```

#### 4. Validation & Processing
- **Validation**: Cek role admin, validasi data input
- **Create Course**: Insert ke tabel `courses`
- **Parse Schedule**: Parse string schedule menjadi multiple time slots
- **Create Schedules**: Untuk setiap slot, insert ke `class_schedules`
- **Assign Instructor**: Set instructor_id berdasarkan availability atau manual assignment

#### 5. Schedule Parsing Logic
String schedule di-parse menjadi:
- Days: Monday, Wednesday
- Times: 19:00-20:00 untuk setiap hari
- Duration: Sesuai duration_minutes course

#### 6. Instructor Assignment
- Instructor dipilih berdasarkan:
  - Specialization match dengan instrument course
  - Availability pada waktu schedule
  - Workload balance antar instructors

#### 7. Response
```json
{
  "success": true,
  "course": {
    "id": "uuid-course",
    "title": "Piano Beginner Course",
    "schedules": [
      {
        "id": "uuid-schedule-1",
        "instructor_id": "uuid-instructor",
        "start_time": "2025-10-21T19:00:00Z",
        "end_time": "2025-10-21T20:00:00Z"
      },
      {
        "id": "uuid-schedule-2",
        "instructor_id": "uuid-instructor",
        "start_time": "2025-10-23T19:00:00Z",
        "end_time": "2025-10-23T20:00:00Z"
      }
    ]
  }
}
```

## Endpoint API

### POST /api/courses
**Purpose**: Create new course with schedules
**Auth**: Admin only
**Input**: Course data with schedule string
**Output**: Course object with generated schedules

### GET /api/schedules/available
**Purpose**: Get available class schedules
**Auth**: Public (for students to view)
**Output**: Array of available schedule slots

## Error Handling
- **401 Unauthorized**: Invalid/missing JWT token
- **403 Forbidden**: Non-admin user attempting creation
- **400 Bad Request**: Invalid course data or schedule format
- **500 Internal Error**: Database or processing error

## Testing
Integration tests available di:
- `services/course/__tests__/course.integration.spec.ts`
- `services/booking/__tests__/bookingIntegration.test.ts`

## Dependencies
- Course Service: Port 3003
- Database: Supabase remote/production
- Auth Service: For instructor data
- API Gateway: For routing

## Future Enhancements
- UI Admin panel untuk create course
- Automated instructor assignment algorithm
- Conflict detection untuk schedule overlaps
- Bulk course creation untuk multiple instruments</content>
<parameter name="filePath">d:\Tugas\PPL\New folder\Backend\docs\COURSE_CREATION_AND_SCHEDULING_FLOW.md