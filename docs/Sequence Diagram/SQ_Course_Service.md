# Sequence Diagram - Course Service

## 1. Gambaran Umum

Course Service adalah layanan untuk mengelola data kursus musik di sistem Shema Music. Service ini berjalan pada Port 3003 dan bertanggung jawab untuk:

- **Course CRUD**: Operasi Create, Read, Update, Delete untuk kursus
- **Instructor Listing**: Menampilkan daftar instructor
- **Instrument Listing**: Menampilkan daftar instrumen musik
- **Level Listing**: Menampilkan daftar level pembelajaran

## 2. Arsitektur Service

Course Service menggunakan Supabase sebagai database dan mendukung akses public untuk operasi read serta protected access untuk operasi write.

### 2.1 Access Control

| Endpoint | Access | Role Required |
|----------|--------|---------------|
| GET /courses | Public | - |
| GET /courses/:id | Public | - |
| POST /courses | Protected | Admin |
| PUT /courses/:id | Protected | Admin, Instructor |
| DELETE /courses/:id | Protected | Admin |
| GET /instructors | Public | - |
| GET /instruments | Public | - |
| GET /levels | Public | - |

## 3. Sequence Diagram - Get Courses

### 3.1 Get All Courses Flow

Diagram ini menunjukkan alur pengambilan daftar kursus dengan filter.

#### PlantUML

```plantuml
@startuml Get_Courses
title Get All Courses Flow

actor User
participant "API Gateway" as Gateway
participant "Course Service\n(Port 3003)" as CourseSvc
database "Supabase" as DB

User -> Gateway: GET /courses?search=piano&instructor_id=123
Gateway -> CourseSvc: Forward Request
activate CourseSvc

CourseSvc -> CourseSvc: Log Request Path

CourseSvc -> DB: SELECT * FROM courses\nORDER BY created_at DESC
activate DB
DB --> CourseSvc: All Courses Array
deactivate DB

CourseSvc -> CourseSvc: Apply Search Filter\n(title OR description LIKE search)

CourseSvc -> CourseSvc: Apply Instructor Filter\n(instructor_name LIKE instructor_id)

CourseSvc -> CourseSvc: Build Pagination Response

CourseSvc --> Gateway: {\n  success: true,\n  data: {\n    courses: [...],\n    pagination: {...}\n  }\n}
deactivate CourseSvc

Gateway --> User: Courses List

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Get All Courses Flow
    
    actor User
    participant Gateway as API Gateway
    participant CourseSvc as Course Service<br/>(Port 3003)
    participant DB as Supabase
    
    User->>Gateway: GET /courses?search=piano
    Gateway->>CourseSvc: Forward Request
    activate CourseSvc
    
    CourseSvc->>CourseSvc: Log Request Path
    
    CourseSvc->>DB: SELECT * FROM courses ORDER BY created_at DESC
    activate DB
    DB-->>CourseSvc: All Courses Array
    deactivate DB
    
    CourseSvc->>CourseSvc: Apply Search Filter
    CourseSvc->>CourseSvc: Apply Instructor Filter
    CourseSvc->>CourseSvc: Build Pagination Response
    
    CourseSvc-->>Gateway: {success, data: {courses, pagination}}
    deactivate CourseSvc
    
    Gateway-->>User: Courses List
```

### 3.2 Get Course By ID Flow

Diagram ini menunjukkan alur pengambilan detail kursus berdasarkan ID.

#### PlantUML

```plantuml
@startuml Get_Course_By_ID
title Get Course By ID Flow

actor User
participant "API Gateway" as Gateway
participant "Course Service" as CourseSvc
database "Supabase" as DB

User -> Gateway: GET /courses/:id
Gateway -> CourseSvc: Forward Request
activate CourseSvc

CourseSvc -> CourseSvc: Extract Course ID from params

CourseSvc -> DB: SELECT * FROM courses\nWHERE id = :id
activate DB
DB --> CourseSvc: Course Data or null
deactivate DB

alt Course Found
    CourseSvc --> Gateway: {\n  success: true,\n  data: course\n}
else Course Not Found (PGRST116)
    CourseSvc --> Gateway: 404\n{\n  success: false,\n  error: {\n    code: "COURSE_NOT_FOUND",\n    message: "Course with ID '...' not found"\n  }\n}
end

deactivate CourseSvc

Gateway --> User: Response

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Get Course By ID Flow
    
    actor User
    participant Gateway as API Gateway
    participant CourseSvc as Course Service
    participant DB as Supabase
    
    User->>Gateway: GET /courses/:id
    Gateway->>CourseSvc: Forward Request
    activate CourseSvc
    
    CourseSvc->>CourseSvc: Extract Course ID
    
    CourseSvc->>DB: SELECT * FROM courses WHERE id = :id
    activate DB
    DB-->>CourseSvc: Course Data or null
    deactivate DB
    
    alt Course Found
        CourseSvc-->>Gateway: {success: true, data: course}
    else Course Not Found
        CourseSvc-->>Gateway: 404 {code: "COURSE_NOT_FOUND"}
    end
    
    deactivate CourseSvc
    
    Gateway-->>User: Response
```

## 4. Sequence Diagram - Create Course

### 4.1 Create Course Flow (Admin Only)

Diagram ini menunjukkan alur pembuatan kursus baru dengan validasi autentikasi.

#### PlantUML

```plantuml
@startuml Create_Course
title Create Course Flow

actor Admin
participant "API Gateway" as Gateway
participant "Firebase Auth" as Firebase
participant "Course Service\n(Port 3003)" as CourseSvc
database "Supabase" as DB

Admin -> Gateway: POST /courses\n{title, description, level, price_per_session, ...}\n(Authorization: Bearer token)

Gateway -> Gateway: Auth Middleware
Gateway -> Firebase: Verify Token
Firebase --> Gateway: Decoded Token (role: admin)

Gateway -> CourseSvc: Forward Request\n(X-Gateway-Request: true, X-User-Role: admin)
activate CourseSvc

CourseSvc -> CourseSvc: Check X-Gateway-Request header

alt Gateway Request (Trusted)
    CourseSvc -> CourseSvc: Check X-User-Role header
    
    alt Role is Admin
        CourseSvc -> CourseSvc: Validate Required Fields\n(title, description, level, price, duration, max_students)
        
        alt Validation Passed
            CourseSvc -> DB: INSERT INTO courses\n{title, description, level, price_per_session,\nduration_minutes, max_students, instrument,\nis_active: true, created_at}
            activate DB
            DB --> CourseSvc: New Course Record
            deactivate DB
            
            CourseSvc --> Gateway: 201 Created\n{success: true, data: course}
        else Validation Failed
            CourseSvc --> Gateway: 400 Bad Request\n{code: "VALIDATION_ERROR"}
        end
    else Not Admin
        CourseSvc --> Gateway: 403 Forbidden\n{code: "AUTH_INSUFFICIENT_PERMISSIONS"}
    end
else Direct Request
    CourseSvc -> CourseSvc: Fallback to Firebase Token Validation
    CourseSvc -> Firebase: Verify Bearer Token
    Firebase --> CourseSvc: Decoded Token
    note right: Same validation flow
end

deactivate CourseSvc

Gateway --> Admin: Response

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Create Course Flow
    
    actor Admin
    participant Gateway as API Gateway
    participant Firebase as Firebase Auth
    participant CourseSvc as Course Service<br/>(Port 3003)
    participant DB as Supabase
    
    Admin->>Gateway: POST /courses<br/>{title, description, level, ...}<br/>(Authorization: Bearer token)
    
    Gateway->>Gateway: Auth Middleware
    Gateway->>Firebase: Verify Token
    Firebase-->>Gateway: Decoded Token (role: admin)
    
    Gateway->>CourseSvc: Forward Request<br/>(X-Gateway-Request: true, X-User-Role: admin)
    activate CourseSvc
    
    CourseSvc->>CourseSvc: Check X-Gateway-Request header
    
    alt Gateway Request (Trusted)
        CourseSvc->>CourseSvc: Check X-User-Role header
        
        alt Role is Admin
            CourseSvc->>CourseSvc: Validate Required Fields
            
            alt Validation Passed
                CourseSvc->>DB: INSERT INTO courses
                DB-->>CourseSvc: New Course Record
                CourseSvc-->>Gateway: 201 Created
            else Validation Failed
                CourseSvc-->>Gateway: 400 Bad Request
            end
        else Not Admin
            CourseSvc-->>Gateway: 403 Forbidden
        end
    end
    
    deactivate CourseSvc
    
    Gateway-->>Admin: Response
```

## 5. Sequence Diagram - Update Course

### 5.1 Update Course Flow (Admin/Instructor)

Diagram ini menunjukkan alur update kursus dengan validasi role.

#### PlantUML

```plantuml
@startuml Update_Course
title Update Course Flow

actor Admin
participant "API Gateway" as Gateway
participant "Course Service" as CourseSvc
database "Supabase" as DB

Admin -> Gateway: PUT /courses/:id\n{title, description, ...}\n(Authorization: Bearer token)

Gateway -> Gateway: Verify Token & Role\n(admin or instructor)

Gateway -> CourseSvc: Forward Request\n(X-User-Role: admin)
activate CourseSvc

CourseSvc -> CourseSvc: Check Role Permission\n(admin OR instructor allowed)

alt Authorized
    CourseSvc -> CourseSvc: Extract Course ID
    
    CourseSvc -> DB: SELECT * FROM courses\nWHERE id = :id
    activate DB
    DB --> CourseSvc: Existing Course
    deactivate DB
    
    alt Course Exists
        CourseSvc -> DB: UPDATE courses\nSET {...}\nWHERE id = :id
        activate DB
        DB --> CourseSvc: Updated Course
        deactivate DB
        
        CourseSvc --> Gateway: 200 OK\n{success: true, data: course}
    else Course Not Found
        CourseSvc --> Gateway: 404 Not Found
    end
else Not Authorized
    CourseSvc --> Gateway: 403 Forbidden
end

deactivate CourseSvc

Gateway --> Admin: Response

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Update Course Flow
    
    actor Admin
    participant Gateway as API Gateway
    participant CourseSvc as Course Service
    participant DB as Supabase
    
    Admin->>Gateway: PUT /courses/:id<br/>{title, description}<br/>(Authorization: Bearer token)
    
    Gateway->>Gateway: Verify Token & Role
    
    Gateway->>CourseSvc: Forward Request<br/>(X-User-Role: admin)
    activate CourseSvc
    
    CourseSvc->>CourseSvc: Check Role Permission
    
    alt Authorized
        CourseSvc->>DB: SELECT FROM courses WHERE id = :id
        DB-->>CourseSvc: Existing Course
        
        alt Course Exists
            CourseSvc->>DB: UPDATE courses SET {...}
            DB-->>CourseSvc: Updated Course
            CourseSvc-->>Gateway: 200 OK
        else Course Not Found
            CourseSvc-->>Gateway: 404 Not Found
        end
    else Not Authorized
        CourseSvc-->>Gateway: 403 Forbidden
    end
    
    deactivate CourseSvc
    
    Gateway-->>Admin: Response
```

## 6. Sequence Diagram - Delete Course

### 6.1 Delete Course Flow (Admin Only)

Diagram ini menunjukkan alur penghapusan kursus.

#### PlantUML

```plantuml
@startuml Delete_Course
title Delete Course Flow

actor Admin
participant "API Gateway" as Gateway
participant "Course Service" as CourseSvc
database "Supabase" as DB

Admin -> Gateway: DELETE /courses/:id\n(Authorization: Bearer token)

Gateway -> Gateway: Verify Admin Role

Gateway -> CourseSvc: Forward Request
activate CourseSvc

CourseSvc -> CourseSvc: Verify Admin Permission

CourseSvc -> DB: SELECT * FROM courses\nWHERE id = :id
activate DB
DB --> CourseSvc: Course Data
deactivate DB

alt Course Found
    CourseSvc -> DB: DELETE FROM courses\nWHERE id = :id
    activate DB
    DB --> CourseSvc: Deleted
    deactivate DB
    
    CourseSvc --> Gateway: 200 OK\n{success: true, message: "Course deleted"}
else Course Not Found
    CourseSvc --> Gateway: 404 Not Found
end

deactivate CourseSvc

Gateway --> Admin: Response

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Delete Course Flow
    
    actor Admin
    participant Gateway as API Gateway
    participant CourseSvc as Course Service
    participant DB as Supabase
    
    Admin->>Gateway: DELETE /courses/:id<br/>(Authorization: Bearer token)
    
    Gateway->>Gateway: Verify Admin Role
    
    Gateway->>CourseSvc: Forward Request
    activate CourseSvc
    
    CourseSvc->>CourseSvc: Verify Admin Permission
    
    CourseSvc->>DB: SELECT FROM courses WHERE id = :id
    DB-->>CourseSvc: Course Data
    
    alt Course Found
        CourseSvc->>DB: DELETE FROM courses WHERE id = :id
        DB-->>CourseSvc: Deleted
        CourseSvc-->>Gateway: 200 OK
    else Course Not Found
        CourseSvc-->>Gateway: 404 Not Found
    end
    
    deactivate CourseSvc
    
    Gateway-->>Admin: Response
```

## 7. Sequence Diagram - Get Instructors

### 7.1 Get Instructors List Flow

Diagram ini menunjukkan alur pengambilan daftar instructor (public).

#### PlantUML

```plantuml
@startuml Get_Instructors
title Get Instructors List Flow

actor User
participant "API Gateway" as Gateway
participant "Course Service" as CourseSvc
database "Supabase" as DB

User -> Gateway: GET /courses/instructors
Gateway -> CourseSvc: Forward Request
activate CourseSvc

CourseSvc -> CourseSvc: Log Route Call

CourseSvc -> DB: SELECT * FROM instructor_profiles\nJOIN users ON instructor_profiles.user_id = users.id\nWHERE users.role = 'instructor'
activate DB
DB --> CourseSvc: Instructors Array
deactivate DB

CourseSvc --> Gateway: {\n  success: true,\n  data: {\n    instructors: [\n      {id, full_name, specialization, bio, ...}\n    ]\n  }\n}
deactivate CourseSvc

Gateway --> User: Instructors List

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Get Instructors List Flow
    
    actor User
    participant Gateway as API Gateway
    participant CourseSvc as Course Service
    participant DB as Supabase
    
    User->>Gateway: GET /courses/instructors
    Gateway->>CourseSvc: Forward Request
    activate CourseSvc
    
    CourseSvc->>CourseSvc: Log Route Call
    
    CourseSvc->>DB: SELECT FROM instructor_profiles JOIN users
    activate DB
    DB-->>CourseSvc: Instructors Array
    deactivate DB
    
    CourseSvc-->>Gateway: {success: true, data: {instructors}}
    deactivate CourseSvc
    
    Gateway-->>User: Instructors List
```

## 8. Sequence Diagram - Get Instruments

### 8.1 Get Instruments List Flow

Diagram ini menunjukkan alur pengambilan daftar instrumen musik.

#### PlantUML

```plantuml
@startuml Get_Instruments
title Get Instruments List Flow

actor User
participant "API Gateway" as Gateway
participant "Course Service" as CourseSvc
database "Supabase" as DB

User -> Gateway: GET /courses/instruments
Gateway -> CourseSvc: Forward Request
activate CourseSvc

CourseSvc -> DB: SELECT DISTINCT instrument\nFROM courses\nWHERE instrument IS NOT NULL
activate DB
DB --> CourseSvc: Instruments Array
deactivate DB

CourseSvc --> Gateway: {\n  success: true,\n  data: {\n    instruments: ["Piano", "Guitar", "Violin", ...]\n  }\n}
deactivate CourseSvc

Gateway --> User: Instruments List

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Get Instruments List Flow
    
    actor User
    participant Gateway as API Gateway
    participant CourseSvc as Course Service
    participant DB as Supabase
    
    User->>Gateway: GET /courses/instruments
    Gateway->>CourseSvc: Forward Request
    activate CourseSvc
    
    CourseSvc->>DB: SELECT DISTINCT instrument FROM courses
    activate DB
    DB-->>CourseSvc: Instruments Array
    deactivate DB
    
    CourseSvc-->>Gateway: {success: true, data: {instruments}}
    deactivate CourseSvc
    
    Gateway-->>User: Instruments List
```

## 9. Sequence Diagram - Get Levels

### 9.1 Get Levels List Flow

Diagram ini menunjukkan alur pengambilan daftar level pembelajaran.

#### PlantUML

```plantuml
@startuml Get_Levels
title Get Levels List Flow

actor User
participant "API Gateway" as Gateway
participant "Course Service" as CourseSvc
database "Supabase" as DB

User -> Gateway: GET /courses/levels
Gateway -> CourseSvc: Forward Request
activate CourseSvc

CourseSvc -> DB: SELECT DISTINCT level\nFROM courses\nWHERE level IS NOT NULL
activate DB
DB --> CourseSvc: Levels Array
deactivate DB

CourseSvc --> Gateway: {\n  success: true,\n  data: {\n    levels: ["beginner", "intermediate", "advanced"]\n  }\n}
deactivate CourseSvc

Gateway --> User: Levels List

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Get Levels List Flow
    
    actor User
    participant Gateway as API Gateway
    participant CourseSvc as Course Service
    participant DB as Supabase
    
    User->>Gateway: GET /courses/levels
    Gateway->>CourseSvc: Forward Request
    activate CourseSvc
    
    CourseSvc->>DB: SELECT DISTINCT level FROM courses
    activate DB
    DB-->>CourseSvc: Levels Array
    deactivate DB
    
    CourseSvc-->>Gateway: {success: true, data: {levels}}
    deactivate CourseSvc
    
    Gateway-->>User: Levels List
```

## 10. Error Handling

### 10.1 Error Response Format

Semua error response mengikuti format standar:

```
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human readable message",
    details: "Optional additional details"
  }
}
```

### 10.2 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| COURSE_NOT_FOUND | 404 | Course with specified ID not found |
| VALIDATION_ERROR | 400 | Missing required fields |
| AUTH_MISSING_TOKEN | 401 | Authorization token required |
| AUTH_TOKEN_EXPIRED | 401 | Firebase token expired |
| AUTH_TOKEN_INVALID | 401 | Invalid Firebase token |
| AUTH_INSUFFICIENT_PERMISSIONS | 403 | User role not authorized |
| DATABASE_ERROR | 500 | Database operation failed |
| INTERNAL_SERVER_ERROR | 500 | Unexpected server error |

## 11. Endpoint Summary

### 11.1 Public Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | /courses | List all courses (with filters) |
| GET | /courses/:id | Get course by ID |
| GET | /courses/instructors | List all instructors |
| GET | /courses/instruments | List all instruments |
| GET | /courses/levels | List all levels |

### 11.2 Protected Endpoints

| Method | Endpoint | Role | Deskripsi |
|--------|----------|------|-----------|
| POST | /courses | Admin | Create new course |
| PUT | /courses/:id | Admin, Instructor | Update course |
| DELETE | /courses/:id | Admin | Delete course |
