# Sequence Diagram - API Gateway Service

## 1. Gambaran Umum

API Gateway adalah single entry point untuk semua request dari client ke sistem backend Shema Music. Service ini berjalan pada Port 3000 dan bertanggung jawab untuk:

- **Routing**: Mengarahkan request ke microservice yang sesuai
- **Authentication**: Memvalidasi Firebase ID Token sebelum meneruskan ke service yang membutuhkan autentikasi
- **Load Balancing**: Mendistribusikan request ke service yang tersedia
- **WebSocket Handling**: Mengelola koneksi WebSocket untuk notifikasi real-time

## 2. Arsitektur Routing

API Gateway menggunakan pattern proxy untuk meneruskan request ke microservice yang sesuai. Setiap route memiliki konfigurasi service URL target dan middleware yang diperlukan.

### 2.1 Service URLs

| Service | URL Internal | Deskripsi |
|---------|--------------|-----------|
| Auth Service | http://auth:3001 | Autentikasi admin |
| Admin Service | http://admin:3002 | Manajemen admin |
| Course Service | http://course:3003 | Manajemen kursus |
| Booking Service | http://booking:3008 | Registrasi dan booking |
| Recommendation Service | http://recommendation:3005 | Rekomendasi AI |
| Notification Service | http://notification:3009 | Notifikasi real-time |

## 3. Sequence Diagram - Request Routing Flow

### 3.1 Public Route Flow (Tanpa Autentikasi)

Diagram ini menunjukkan alur request untuk endpoint publik yang tidak memerlukan autentikasi.

#### PlantUML

```plantuml
@startuml Request_Routing_Public
title Public Route Request Flow

actor Client
participant "API Gateway\n(Port 3000)" as Gateway
participant "Target Service" as Service
database "Supabase" as DB

Client -> Gateway: HTTP Request\n(GET /courses)
activate Gateway

Gateway -> Gateway: CORS Validation
Gateway -> Gateway: Request Logging

Gateway -> Service: Proxy Request\n(with X-Gateway-Request header)
activate Service

Service -> DB: Query Data
activate DB
DB --> Service: Return Data
deactivate DB

Service --> Gateway: Response (JSON)
deactivate Service

Gateway --> Client: Response (JSON)
deactivate Gateway

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Public Route Request Flow
    
    actor Client
    participant Gateway as API Gateway<br/>(Port 3000)
    participant Service as Target Service
    participant DB as Supabase
    
    Client->>Gateway: HTTP Request (GET /courses)
    activate Gateway
    
    Gateway->>Gateway: CORS Validation
    Gateway->>Gateway: Request Logging
    
    Gateway->>Service: Proxy Request<br/>(X-Gateway-Request: true)
    activate Service
    
    Service->>DB: Query Data
    activate DB
    DB-->>Service: Return Data
    deactivate DB
    
    Service-->>Gateway: Response (JSON)
    deactivate Service
    
    Gateway-->>Client: Response (JSON)
    deactivate Gateway
```

### 3.2 Protected Route Flow (Dengan Autentikasi)

Diagram ini menunjukkan alur request untuk endpoint yang memerlukan autentikasi Firebase.

#### PlantUML

```plantuml
@startuml Request_Routing_Protected
title Protected Route Request Flow

actor Client
participant "API Gateway\n(Port 3000)" as Gateway
participant "Firebase Auth" as Firebase
participant "Target Service" as Service
database "Supabase" as DB

Client -> Gateway: HTTP Request\n(Authorization: Bearer {token})
activate Gateway

Gateway -> Gateway: CORS Validation
Gateway -> Gateway: Extract Bearer Token

Gateway -> Firebase: Verify ID Token
activate Firebase
Firebase --> Gateway: Decoded Token\n(uid, email, role)
deactivate Firebase

alt Token Valid
    Gateway -> Gateway: Set User Context\n(X-User-Id, X-User-Role)
    
    Gateway -> Service: Proxy Request\n(with user headers)
    activate Service
    
    Service -> Service: Role Authorization Check
    
    alt Authorized
        Service -> DB: Execute Operation
        activate DB
        DB --> Service: Return Result
        deactivate DB
        
        Service --> Gateway: Success Response
    else Unauthorized
        Service --> Gateway: 403 Forbidden
    end
    deactivate Service
    
    Gateway --> Client: Response
else Token Invalid/Expired
    Gateway --> Client: 401 Unauthorized
end

deactivate Gateway

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Protected Route Request Flow
    
    actor Client
    participant Gateway as API Gateway<br/>(Port 3000)
    participant Firebase as Firebase Auth
    participant Service as Target Service
    participant DB as Supabase
    
    Client->>Gateway: HTTP Request<br/>(Authorization: Bearer token)
    activate Gateway
    
    Gateway->>Gateway: CORS Validation
    Gateway->>Gateway: Extract Bearer Token
    
    Gateway->>Firebase: Verify ID Token
    activate Firebase
    Firebase-->>Gateway: Decoded Token (uid, email, role)
    deactivate Firebase
    
    alt Token Valid
        Gateway->>Gateway: Set User Context Headers
        Gateway->>Service: Proxy Request (with user headers)
        activate Service
        
        Service->>Service: Role Authorization Check
        
        alt Authorized
            Service->>DB: Execute Operation
            activate DB
            DB-->>Service: Return Result
            deactivate DB
            Service-->>Gateway: Success Response
        else Unauthorized
            Service-->>Gateway: 403 Forbidden
        end
        deactivate Service
        
        Gateway-->>Client: Response
    else Token Invalid/Expired
        Gateway-->>Client: 401 Unauthorized
    end
    
    deactivate Gateway
```

## 4. Sequence Diagram - WebSocket Connection Flow

### 4.1 Admin WebSocket Notification

Diagram ini menunjukkan alur koneksi WebSocket untuk notifikasi admin secara real-time.

#### PlantUML

```plantuml
@startuml WebSocket_Admin
title Admin WebSocket Notification Flow

actor Admin
participant "API Gateway\n/ws" as WS_Gateway
participant "Kafka" as Kafka
participant "Booking Service" as Booking

== Connection Phase ==
Admin -> WS_Gateway: WebSocket Upgrade Request
WS_Gateway -> WS_Gateway: Generate Client ID
WS_Gateway --> Admin: Connection Established

Admin -> WS_Gateway: Subscribe Message\n{"type": "subscribe", "topics": ["booking.created"]}
WS_Gateway -> WS_Gateway: Register Subscription
WS_Gateway --> Admin: Subscription Confirmed

== Event Broadcasting ==
Booking -> Kafka: Publish Event\n(booking.created)
Kafka -> WS_Gateway: Consume Event
WS_Gateway -> WS_Gateway: Match Subscriptions
WS_Gateway --> Admin: Push Notification\n{"type": "broadcast", "data": {...}}

== Heartbeat ==
loop Every 30 seconds
    WS_Gateway --> Admin: Ping
    Admin --> WS_Gateway: Pong
end

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Admin WebSocket Notification Flow
    
    actor Admin
    participant WSGateway as API Gateway<br/>/ws
    participant Kafka as Kafka
    participant Booking as Booking Service
    
    Note over Admin,Booking: Connection Phase
    
    Admin->>WSGateway: WebSocket Upgrade Request
    WSGateway->>WSGateway: Generate Client ID
    WSGateway-->>Admin: Connection Established
    
    Admin->>WSGateway: Subscribe Message<br/>{"type": "subscribe", "topics": ["booking.created"]}
    WSGateway->>WSGateway: Register Subscription
    WSGateway-->>Admin: Subscription Confirmed
    
    Note over Admin,Booking: Event Broadcasting
    
    Booking->>Kafka: Publish Event (booking.created)
    Kafka->>WSGateway: Consume Event
    WSGateway->>WSGateway: Match Subscriptions
    WSGateway-->>Admin: Push Notification<br/>{"type": "broadcast", "data": {...}}
    
    Note over Admin,WSGateway: Heartbeat
    
    loop Every 30 seconds
        WSGateway-->>Admin: Ping
        Admin-->>WSGateway: Pong
    end
```

### 4.2 Availability WebSocket

Diagram ini menunjukkan alur koneksi WebSocket untuk update ketersediaan jadwal secara real-time.

#### PlantUML

```plantuml
@startuml WebSocket_Availability
title Availability WebSocket Flow

actor User
participant "API Gateway\n/ws/availability" as WS_Avail
participant "Kafka" as Kafka
participant "Booking Service" as Booking

== Connection & Subscription ==
User -> WS_Avail: WebSocket Connect
WS_Avail --> User: Connected

User -> WS_Avail: Subscribe\n{"type": "subscribe", "instructor_id": "123"}
WS_Avail -> WS_Avail: Store Subscription Filter
WS_Avail --> User: Subscribed

== Real-time Updates ==
Booking -> Kafka: schedule.updated\n{instructor_id: "123", ...}
Kafka -> WS_Avail: Consume Event
WS_Avail -> WS_Avail: Filter by Instructor ID
WS_Avail --> User: Availability Update\n{"type": "availability_update", ...}

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Availability WebSocket Flow
    
    actor User
    participant WSAvail as API Gateway<br/>/ws/availability
    participant Kafka as Kafka
    participant Booking as Booking Service
    
    Note over User,Booking: Connection & Subscription
    
    User->>WSAvail: WebSocket Connect
    WSAvail-->>User: Connected
    
    User->>WSAvail: Subscribe<br/>{"type": "subscribe", "instructor_id": "123"}
    WSAvail->>WSAvail: Store Subscription Filter
    WSAvail-->>User: Subscribed
    
    Note over User,Booking: Real-time Updates
    
    Booking->>Kafka: schedule.updated<br/>{instructor_id: "123", ...}
    Kafka->>WSAvail: Consume Event
    WSAvail->>WSAvail: Filter by Instructor ID
    WSAvail-->>User: Availability Update<br/>{"type": "availability_update", ...}
```

## 5. Sequence Diagram - Health Check Flow

### 5.1 Service Health Aggregation

Diagram ini menunjukkan alur pengecekan kesehatan semua microservice.

#### PlantUML

```plantuml
@startuml Health_Check
title Service Health Check Flow

actor Client
participant "API Gateway" as Gateway
participant "Auth Service" as Auth
participant "Course Service" as Course
participant "Booking Service" as Booking
participant "Recommendation Service" as Recommend

Client -> Gateway: GET /services/health
activate Gateway

par Parallel Health Checks
    Gateway -> Auth: GET /health
    activate Auth
    Auth --> Gateway: {status: "healthy"}
    deactivate Auth
and
    Gateway -> Course: GET /health
    activate Course
    Course --> Gateway: {status: "healthy"}
    deactivate Course
and
    Gateway -> Booking: GET /health
    activate Booking
    Booking --> Gateway: {status: "healthy"}
    deactivate Booking
and
    Gateway -> Recommend: GET /health
    activate Recommend
    Recommend --> Gateway: {status: "healthy"}
    deactivate Recommend
end

Gateway -> Gateway: Aggregate Results
Gateway --> Client: {\n  overall_health: "healthy",\n  services: [...]\n}
deactivate Gateway

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Service Health Check Flow
    
    actor Client
    participant Gateway as API Gateway
    participant Auth as Auth Service
    participant Course as Course Service
    participant Booking as Booking Service
    participant Recommend as Recommendation Service
    
    Client->>Gateway: GET /services/health
    activate Gateway
    
    par Parallel Health Checks
        Gateway->>Auth: GET /health
        Auth-->>Gateway: {status: "healthy"}
    and
        Gateway->>Course: GET /health
        Course-->>Gateway: {status: "healthy"}
    and
        Gateway->>Booking: GET /health
        Booking-->>Gateway: {status: "healthy"}
    and
        Gateway->>Recommend: GET /health
        Recommend-->>Gateway: {status: "healthy"}
    end
    
    Gateway->>Gateway: Aggregate Results
    Gateway-->>Client: {overall_health: "healthy", services: [...]}
    deactivate Gateway
```

## 6. Sequence Diagram - Error Handling Flow

### 6.1 Service Unavailable Handling

Diagram ini menunjukkan alur penanganan error ketika service tidak tersedia.

#### PlantUML

```plantuml
@startuml Error_Handling
title Service Unavailable Error Handling

actor Client
participant "API Gateway" as Gateway
participant "Target Service" as Service

Client -> Gateway: HTTP Request
activate Gateway

Gateway -> Service: Proxy Request
activate Service

note right of Service: Service unavailable\nor timeout

Service --> Gateway: Connection Refused / Timeout
deactivate Service

Gateway -> Gateway: Detect Error Type

alt Connection Error
    Gateway --> Client: 503 Service Unavailable\n{\n  code: "SERVICE_UNAVAILABLE",\n  message: "Unable to connect to backend service"\n}
else Timeout Error
    Gateway --> Client: 504 Gateway Timeout\n{\n  code: "REQUEST_TIMEOUT",\n  message: "Request to service timed out"\n}
else Unknown Error
    Gateway --> Client: 500 Internal Server Error\n{\n  code: "INTERNAL_SERVER_ERROR",\n  message: "An unexpected error occurred"\n}
end

deactivate Gateway

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Service Unavailable Error Handling
    
    actor Client
    participant Gateway as API Gateway
    participant Service as Target Service
    
    Client->>Gateway: HTTP Request
    activate Gateway
    
    Gateway->>Service: Proxy Request
    activate Service
    
    Note right of Service: Service unavailable<br/>or timeout
    
    Service-->>Gateway: Connection Refused / Timeout
    deactivate Service
    
    Gateway->>Gateway: Detect Error Type
    
    alt Connection Error
        Gateway-->>Client: 503 Service Unavailable<br/>{code: "SERVICE_UNAVAILABLE"}
    else Timeout Error
        Gateway-->>Client: 504 Gateway Timeout<br/>{code: "REQUEST_TIMEOUT"}
    else Unknown Error
        Gateway-->>Client: 500 Internal Server Error<br/>{code: "INTERNAL_SERVER_ERROR"}
    end
    
    deactivate Gateway
```

## 7. Endpoint Summary

### 7.1 Auth Routes (Public)
- `POST /auth/register` - Registrasi admin baru
- `POST /auth/login` - Login admin
- `POST /auth/firebase/register` - Registrasi via Firebase
- `POST /auth/firebase/login` - Login via Firebase

### 7.2 Admin Routes (Protected - Admin Only)
- `GET /admin/dashboard` - Dashboard statistik
- `GET /admin/users` - Daftar semua user
- `GET /admin/instructor` - Daftar instructor
- `GET /admin/students` - Daftar siswa
- `GET /admin/rooms` - Daftar ruangan
- `GET /admin/schedules` - Daftar jadwal

### 7.3 Course Routes (Mixed)
- `GET /courses` - Daftar kursus (Public)
- `POST /courses` - Buat kursus (Protected)
- `PUT /courses/:id` - Update kursus (Protected)
- `DELETE /courses/:id` - Hapus kursus (Protected)

### 7.4 Booking Routes (Mixed)
- `POST /booking/register-course` - Registrasi kursus (Public)
- `GET /booking/available-instructors` - Daftar instructor (Public)
- `GET /booking/bookings` - Semua booking (Protected)
- `POST /booking/:id/confirm` - Konfirmasi booking (Protected)

### 7.5 Recommendation Routes (Session-based)
- `POST /assessment` - Submit assessment
- `GET /results` - Ambil hasil rekomendasi

### 7.6 WebSocket Endpoints
- `/ws` - Admin notifications
- `/ws/availability` - Availability updates
