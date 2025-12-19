# Arsitektur Sistem Frontend-Backend Shema Music

## 1. Pendahuluan

Dokumen ini menjelaskan arsitektur sistem secara menyeluruh dengan fokus pada interaksi antara komponen Frontend dan Backend dalam aplikasi Shema Music. Sistem ini dirancang untuk menyediakan pengalaman pengguna yang seamless dengan komunikasi real-time dan keamanan yang robust.

## 2. Gambaran Umum Interaksi

Sistem Shema Music terdiri dari dua komponen utama:
- **Frontend**: Aplikasi web yang digunakan oleh pengguna (admin dan siswa)
- **Backend**: Kumpulan microservices yang menyediakan API dan logika bisnis

Kedua komponen berkomunikasi melalui:
- REST API untuk operasi CRUD
- WebSocket untuk notifikasi real-time
- Firebase untuk autentikasi

## 3. Diagram Arsitektur Lengkap

### 3.1 High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        ADMIN_UI[Admin Dashboard]
        STUDENT_UI[Student Portal]
        LANDING[Landing Page]
    end
    
    subgraph "Authentication Provider"
        FIREBASE_SDK[Firebase SDK]
        FIREBASE_AUTH[Firebase Auth Server]
    end
    
    subgraph "API Layer"
        APIGW[API Gateway]
        WS_SERVER[WebSocket Server]
    end
    
    subgraph "Backend Services"
        AUTH[Auth Service]
        ADMIN[Admin Service]
        COURSE[Course Service]
        BOOKING[Booking Service]
        RECOMMEND[Recommendation Service]
        NOTIF[Notification Service]
    end
    
    subgraph "Data & Messaging"
        SUPABASE[(Supabase DB)]
        REDIS[(Redis)]
        KAFKA[Kafka]
    end
    
    ADMIN_UI --> FIREBASE_SDK
    STUDENT_UI --> FIREBASE_SDK
    FIREBASE_SDK --> FIREBASE_AUTH
    
    ADMIN_UI --> APIGW
    STUDENT_UI --> APIGW
    LANDING --> APIGW
    
    ADMIN_UI -.->|WebSocket| WS_SERVER
    STUDENT_UI -.->|WebSocket| WS_SERVER
    
    APIGW --> AUTH
    APIGW --> ADMIN
    APIGW --> COURSE
    APIGW --> BOOKING
    APIGW --> RECOMMEND
    
    WS_SERVER --> KAFKA
    NOTIF --> KAFKA
    
    AUTH --> SUPABASE
    ADMIN --> SUPABASE
    COURSE --> SUPABASE
    BOOKING --> SUPABASE
    RECOMMEND --> SUPABASE
    
    AUTH --> REDIS
    RECOMMEND --> REDIS
    NOTIF --> REDIS
```

## 4. Alur Komunikasi Frontend-Backend

### 4.1 Authentication Flow

Proses autentikasi melibatkan Frontend, Firebase, dan Backend Auth Service. Berikut adalah alur lengkapnya:

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant FirebaseSDK
    participant FirebaseServer
    participant APIGateway
    participant AuthService
    participant Supabase
    
    Note over User,Supabase: Login Flow untuk Admin
    
    User->>Frontend: Masukkan Email & Password
    Frontend->>FirebaseSDK: signInWithEmailAndPassword()
    FirebaseSDK->>FirebaseServer: Authenticate
    FirebaseServer-->>FirebaseSDK: Firebase ID Token
    FirebaseSDK-->>Frontend: User Credential + Token
    
    Frontend->>Frontend: Store Token in Memory
    Frontend->>APIGateway: POST /auth/login (Bearer Token)
    APIGateway->>AuthService: Forward Login Request
    AuthService->>FirebaseServer: Verify ID Token
    FirebaseServer-->>AuthService: Decoded Token (uid, email)
    
    AuthService->>Supabase: SELECT * FROM users WHERE firebase_uid = ?
    Supabase-->>AuthService: User Data
    
    alt User is Admin
        AuthService-->>APIGateway: Success + User Data
        APIGateway-->>Frontend: Login Success Response
        Frontend->>Frontend: Store User Session
        Frontend->>User: Redirect to Admin Dashboard
    else User is Not Admin
        AuthService-->>APIGateway: 403 Forbidden
        APIGateway-->>Frontend: Access Denied
        Frontend->>User: Show Error Message
    end
```

### 4.2 Course Registration Flow (Student)

Alur pendaftaran kursus oleh siswa melibatkan beberapa service dan komunikasi real-time ke admin.

```mermaid
sequenceDiagram
    participant Student
    participant Frontend
    participant APIGateway
    participant BookingService
    participant AdminService
    participant Kafka
    participant NotifService
    participant AdminDashboard
    
    Note over Student,AdminDashboard: Student Course Registration Flow
    
    Student->>Frontend: Fill Registration Form
    Frontend->>APIGateway: GET /courses (View Available Courses)
    APIGateway-->>Frontend: Course List
    
    Student->>Frontend: Select Course & Preferences
    Frontend->>APIGateway: POST /booking/validate-preferences
    APIGateway->>BookingService: Validate Time & Instructor
    BookingService-->>APIGateway: Validation Result
    APIGateway-->>Frontend: Preferences Valid/Invalid
    
    alt Preferences Valid
        Frontend->>APIGateway: POST /booking/register-course
        APIGateway->>BookingService: Create Registration
        BookingService->>BookingService: Store in Database
        BookingService->>Kafka: Publish booking.created
        BookingService-->>APIGateway: Registration Created
        APIGateway-->>Frontend: Success Response
        Frontend->>Student: Show Success Message
        
        Note over Kafka,AdminDashboard: Real-time Notification
        Kafka->>NotifService: Consume booking.created
        NotifService->>AdminDashboard: WebSocket Broadcast
        AdminDashboard->>AdminDashboard: Show New Booking Alert
    else Preferences Invalid
        Frontend->>Student: Show Validation Errors
    end
```

### 4.3 Admin Booking Management Flow

Alur admin dalam mengelola booking yang masuk.

```mermaid
sequenceDiagram
    participant Admin
    participant AdminDashboard
    participant APIGateway
    participant BookingService
    participant Kafka
    participant NotifService
    
    Note over Admin,NotifService: Admin Managing Pending Bookings
    
    Admin->>AdminDashboard: Open Dashboard
    AdminDashboard->>APIGateway: GET /booking/admin/bookings/pending
    APIGateway->>BookingService: Get Pending Bookings
    BookingService-->>APIGateway: List of Pending Bookings
    APIGateway-->>AdminDashboard: Booking Data
    AdminDashboard->>Admin: Display Pending Bookings
    
    Admin->>AdminDashboard: Select Booking to Process
    Admin->>AdminDashboard: Assign Time Slot
    
    AdminDashboard->>APIGateway: POST /booking/admin/bookings/:id/assign-slot
    APIGateway->>BookingService: Assign Slot
    BookingService->>BookingService: Update Booking Status
    BookingService->>BookingService: Update Schedule
    BookingService->>Kafka: Publish booking.updated
    BookingService-->>APIGateway: Slot Assigned
    APIGateway-->>AdminDashboard: Success Response
    AdminDashboard->>Admin: Show Confirmation
    
    Kafka->>NotifService: Consume booking.updated
    NotifService->>NotifService: Prepare Notification
```

### 4.4 Assessment & AI Recommendation Flow

Alur siswa mengisi assessment dan menerima rekomendasi dari AI.

```mermaid
sequenceDiagram
    participant Student
    participant Frontend
    participant APIGateway
    participant RecommendService
    participant Redis
    participant GoogleAI
    participant Supabase
    participant NotifService
    
    Note over Student,NotifService: AI-Powered Assessment Flow
    
    Student->>Frontend: Open Assessment Page
    Frontend->>APIGateway: Initial Request
    APIGateway->>RecommendService: Create Session
    RecommendService->>Redis: Store Session (sid)
    RecommendService-->>APIGateway: Set-Cookie: sid
    APIGateway-->>Frontend: Cookie Set
    
    Student->>Frontend: Complete Assessment Form
    Frontend->>APIGateway: POST /assessment (with Cookie)
    APIGateway->>RecommendService: Submit Assessment
    RecommendService->>Supabase: Store Assessment Data
    RecommendService->>Redis: Add to Processing Queue
    RecommendService-->>APIGateway: Submitted (Processing)
    APIGateway-->>Frontend: Assessment Received
    Frontend->>Student: Show "Processing" Message
    
    Note over RecommendService,GoogleAI: Background AI Processing
    RecommendService->>GoogleAI: Analyze Assessment
    GoogleAI-->>RecommendService: AI Recommendations
    RecommendService->>Supabase: Store Results
    RecommendService->>NotifService: Broadcast Result
    
    NotifService->>Frontend: WebSocket: Result Ready
    Frontend->>Student: Display Recommendations
```

### 4.5 Real-time WebSocket Communication

Alur koneksi dan komunikasi WebSocket antara Frontend dan Backend.

```mermaid
sequenceDiagram
    participant AdminDashboard
    participant APIGateway
    participant Kafka
    participant BookingService
    
    Note over AdminDashboard,BookingService: WebSocket Connection & Subscription
    
    AdminDashboard->>APIGateway: WebSocket Connect (wss://api.../ws)
    APIGateway-->>AdminDashboard: Connection Established
    
    AdminDashboard->>APIGateway: Subscribe: admin.notifications
    APIGateway-->>AdminDashboard: Subscribed Confirmation
    
    AdminDashboard->>APIGateway: Subscribe: booking.created
    APIGateway-->>AdminDashboard: Subscribed Confirmation
    
    Note over Kafka,BookingService: Event Occurs
    BookingService->>Kafka: Publish booking.created
    
    Kafka->>APIGateway: Consume Event
    APIGateway->>AdminDashboard: WebSocket Broadcast
    AdminDashboard->>AdminDashboard: Update UI with New Data
```

## 5. Frontend Architecture Integration

### 5.1 Frontend Component Structure

```mermaid
graph TB
    subgraph "Frontend Application"
        subgraph "Pages"
            LOGIN[Login Page]
            DASHBOARD[Admin Dashboard]
            COURSES[Courses Page]
            BOOKING_LIST[Booking List]
            ASSESSMENT[Assessment Page]
            RESULTS[Results Page]
        end
        
        subgraph "Services Layer"
            AUTH_SVC[Auth Service]
            API_SVC[API Service]
            WS_SVC[WebSocket Service]
        end
        
        subgraph "State Management"
            AUTH_STATE[Auth State]
            DATA_STATE[Data State]
            NOTIF_STATE[Notification State]
        end
    end
    
    LOGIN --> AUTH_SVC
    DASHBOARD --> API_SVC
    DASHBOARD --> WS_SVC
    COURSES --> API_SVC
    BOOKING_LIST --> API_SVC
    ASSESSMENT --> API_SVC
    RESULTS --> API_SVC
    
    AUTH_SVC --> AUTH_STATE
    API_SVC --> DATA_STATE
    WS_SVC --> NOTIF_STATE
```

### 5.2 API Integration Pattern

Frontend menggunakan pattern berikut untuk berkomunikasi dengan Backend:

```mermaid
flowchart TD
    subgraph "Frontend Request Flow"
        A[User Action] --> B[Component Handler]
        B --> C[API Service Method]
        C --> D{Add Auth Token?}
        D -->|Protected Route| E[Get Token from State]
        D -->|Public Route| F[Skip Auth]
        E --> G[Prepare Request]
        F --> G
        G --> H[Fetch to API Gateway]
        H --> I{Response Status}
        I -->|200-299| J[Parse Response]
        I -->|401| K[Refresh Token / Redirect Login]
        I -->|4xx/5xx| L[Handle Error]
        J --> M[Update State]
        L --> N[Show Error UI]
    end
```

## 6. Scenario-Based Flows

### 6.1 Scenario: Siswa Baru Mendaftar Kursus

Berikut adalah alur lengkap dari sudut pandang siswa baru yang ingin mendaftar kursus:

**Tahap 1: Explorasi**
- Siswa mengakses landing page
- Melihat daftar kursus yang tersedia (tanpa login)
- Memilih kursus yang diminati

**Tahap 2: Pendaftaran**
- Mengisi formulir pendaftaran dengan data diri
- Memilih preferensi waktu dan instruktur
- Sistem memvalidasi ketersediaan

**Tahap 3: Konfirmasi**
- Booking masuk ke sistem dengan status "pending"
- Admin menerima notifikasi real-time
- Siswa menerima konfirmasi bahwa pendaftaran sedang diproses

```mermaid
stateDiagram-v2
    [*] --> BrowseCourses: Student visits website
    BrowseCourses --> SelectCourse: Choose course
    SelectCourse --> FillForm: Click Register
    FillForm --> ValidatePreferences: Submit form
    ValidatePreferences --> BookingCreated: Validation passed
    ValidatePreferences --> FillForm: Validation failed (show errors)
    BookingCreated --> WaitingApproval: Status: Pending
    WaitingApproval --> Approved: Admin approves
    WaitingApproval --> Rejected: Admin rejects
    Approved --> Scheduled: Slot assigned
    Scheduled --> [*]
    Rejected --> [*]
```

### 6.2 Scenario: Admin Mengelola Booking

Alur admin dalam mengelola pendaftaran kursus yang masuk:

**Tahap 1: Monitoring**
- Admin login ke dashboard
- Melihat daftar booking pending
- Menerima notifikasi real-time untuk booking baru

**Tahap 2: Review**
- Membuka detail booking
- Memeriksa ketersediaan instruktur dan ruangan
- Menentukan slot waktu yang sesuai

**Tahap 3: Assignment**
- Menetapkan jadwal untuk siswa
- Sistem update status booking
- Siswa mendapat notifikasi

```mermaid
stateDiagram-v2
    [*] --> Login: Admin opens dashboard
    Login --> Dashboard: Auth success
    Dashboard --> ViewPending: See pending list
    ViewPending --> SelectBooking: Click booking
    SelectBooking --> CheckAvailability: View details
    CheckAvailability --> AssignSlot: Resources available
    CheckAvailability --> RejectBooking: No resources
    AssignSlot --> Confirmed: Slot assigned
    RejectBooking --> Rejected: Booking cancelled
    Confirmed --> [*]
    Rejected --> [*]
```

### 6.3 Scenario: Assessment dengan AI

Alur siswa mengisi assessment dan mendapat rekomendasi:

```mermaid
stateDiagram-v2
    [*] --> OpenAssessment: Student clicks Assessment
    OpenAssessment --> SessionCreated: Cookie set
    SessionCreated --> AnswerQuestions: Fill questionnaire
    AnswerQuestions --> SubmitAssessment: Click Submit
    SubmitAssessment --> Processing: Show loading
    Processing --> AIAnalysis: Background process
    AIAnalysis --> ResultReady: AI completes
    ResultReady --> DisplayRecommendation: WebSocket notify
    DisplayRecommendation --> [*]
```

## 7. Data Flow Between Components

### 7.1 Request-Response Data Flow

```mermaid
flowchart LR
    subgraph "Frontend"
        FE_REQ[Request Data]
        FE_RES[Response Handler]
    end
    
    subgraph "API Gateway"
        GW_AUTH[Auth Check]
        GW_ROUTE[Router]
        GW_PROXY[Proxy]
    end
    
    subgraph "Backend Service"
        SVC_CTRL[Controller]
        SVC_VALID[Validator]
        SVC_LOGIC[Business Logic]
        SVC_DB[Database Access]
    end
    
    subgraph "Database"
        DB[(Supabase)]
    end
    
    FE_REQ --> GW_AUTH
    GW_AUTH --> GW_ROUTE
    GW_ROUTE --> GW_PROXY
    GW_PROXY --> SVC_CTRL
    SVC_CTRL --> SVC_VALID
    SVC_VALID --> SVC_LOGIC
    SVC_LOGIC --> SVC_DB
    SVC_DB --> DB
    DB --> SVC_DB
    SVC_DB --> SVC_LOGIC
    SVC_LOGIC --> SVC_CTRL
    SVC_CTRL --> GW_PROXY
    GW_PROXY --> FE_RES
```

### 7.2 Real-time Event Flow

```mermaid
flowchart LR
    subgraph "Backend"
        SERVICE[Service]
        KAFKA[Kafka]
        NOTIF[Notification Service]
    end
    
    subgraph "Gateway"
        WS_SERVER[WebSocket Server]
    end
    
    subgraph "Frontend"
        WS_CLIENT[WebSocket Client]
        STATE[App State]
        UI[UI Component]
    end
    
    SERVICE -->|Publish Event| KAFKA
    KAFKA -->|Consume| WS_SERVER
    WS_SERVER -->|Broadcast| WS_CLIENT
    WS_CLIENT -->|Update| STATE
    STATE -->|Re-render| UI
```

## 8. Security in Frontend-Backend Communication

### 8.1 Token Management

```mermaid
sequenceDiagram
    participant Frontend
    participant FirebaseSDK
    participant LocalStorage
    participant APIGateway
    
    Note over Frontend,APIGateway: Token Lifecycle
    
    Frontend->>FirebaseSDK: Get Current User
    FirebaseSDK-->>Frontend: User Object
    Frontend->>FirebaseSDK: getIdToken()
    FirebaseSDK-->>Frontend: Fresh ID Token
    Frontend->>Frontend: Store Token in Memory (NOT localStorage)
    
    Frontend->>APIGateway: API Request + Bearer Token
    APIGateway-->>Frontend: Response
    
    Note over Frontend,FirebaseSDK: Token Refresh (before expiry)
    Frontend->>FirebaseSDK: getIdToken(forceRefresh=true)
    FirebaseSDK-->>Frontend: New Token
```

### 8.2 WebSocket Security

```mermaid
flowchart TD
    A[WebSocket Connect Request] --> B{Validate Origin}
    B -->|Valid Origin| C{Check Authentication}
    B -->|Invalid Origin| D[Reject Connection]
    C -->|Authenticated| E[Accept Connection]
    C -->|Not Authenticated| F{Is Public Topic?}
    F -->|Yes| E
    F -->|No| G[Require Auth]
    E --> H[Register Client]
    H --> I[Subscribe to Topics]
```

## 9. Error Handling Strategy

### 9.1 Frontend Error Handling

```mermaid
flowchart TD
    A[API Error Response] --> B{Error Type}
    B -->|401 Unauthorized| C[Clear Session]
    C --> D[Redirect to Login]
    B -->|403 Forbidden| E[Show Access Denied]
    B -->|404 Not Found| F[Show Not Found Page]
    B -->|422 Validation Error| G[Highlight Form Errors]
    B -->|500+ Server Error| H[Show Generic Error]
    H --> I[Log to Console]
    B -->|Network Error| J[Show Offline Message]
    J --> K[Enable Retry Button]
```

### 9.2 Backend Error Propagation

```mermaid
flowchart LR
    subgraph "Service Layer"
        A[Database Error]
        B[Validation Error]
        C[Business Logic Error]
    end
    
    subgraph "Gateway Layer"
        D[Format Error Response]
        E[Hide Sensitive Details]
    end
    
    subgraph "Frontend"
        F[Display User-Friendly Message]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
```

## 10. Integration Points Summary

### 10.1 API Endpoints Used by Frontend

| Feature | Method | Endpoint | Auth Required |
|---------|--------|----------|---------------|
| Login | POST | /auth/login | No |
| Get Courses | GET | /courses | No |
| Register Course | POST | /booking/register-course | No |
| Get Dashboard | GET | /admin/dashboard | Yes (Admin) |
| Get Pending Bookings | GET | /booking/admin/bookings/pending | Yes (Admin) |
| Assign Slot | POST | /booking/admin/bookings/:id/assign-slot | Yes (Admin) |
| Submit Assessment | POST | /assessment | No (Cookie) |
| Get Results | GET | /results | No (Cookie) |

### 10.2 WebSocket Topics

| Topic | Subscriber | Publisher | Purpose |
|-------|------------|-----------|---------|
| admin.notifications | Admin Dashboard | Various Services | General admin alerts |
| booking.created | Admin Dashboard | Booking Service | New booking notification |
| booking.updated | Admin Dashboard | Booking Service | Booking status change |
| availability-updates | Student Portal | Booking Service | Schedule changes |
| schedule-updates | Admin Dashboard | Admin Service | Schedule modifications |

## 11. Kesimpulan

Arsitektur Frontend-Backend Shema Music dirancang dengan prinsip:

1. **Separation of Concerns**: Frontend dan Backend memiliki tanggung jawab yang jelas
2. **Real-time Communication**: WebSocket memungkinkan notifikasi instant
3. **Security First**: Multiple layers of authentication dan authorization
4. **Scalability**: Microservices architecture memungkinkan scaling independen
5. **User Experience**: Responsif dan informatif dengan proper error handling

Integrasi antara Frontend dan Backend menggunakan standard HTTP/REST untuk operasi CRUD dan WebSocket untuk real-time updates, memastikan pengalaman pengguna yang optimal dengan tetap menjaga keamanan sistem.
