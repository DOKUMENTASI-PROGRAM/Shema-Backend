# Sequence Diagram - Auth Service

## 1. Gambaran Umum

Auth Service adalah layanan autentikasi untuk admin sistem Shema Music. Service ini berjalan pada Port 3001 dan bertanggung jawab untuk:

- **Admin Registration**: Registrasi akun admin baru dengan validasi Firebase
- **Admin Login**: Autentikasi admin menggunakan Firebase ID Token
- **Session Management**: Pengelolaan session dan logout
- **Password Reset**: Reset password melalui Firebase

**Catatan Penting**: Auth Service hanya digunakan untuk admin. Siswa tidak memerlukan autentikasi untuk mendaftar kursus.

## 2. Arsitektur Autentikasi

Auth Service menggunakan Firebase sebagai identity provider dan Supabase sebagai database untuk menyimpan data user. Alur autentikasi menggunakan Firebase ID Token yang diverifikasi oleh backend.

### 2.1 Komponen Integrasi

| Komponen | Fungsi |
|----------|--------|
| Firebase Auth | Identity provider, token generation |
| Supabase Auth | User management di database |
| Supabase DB | Penyimpanan data user |
| Redis | Session cache (optional) |
| Kafka | Event publishing |

## 3. Sequence Diagram - Admin Registration

### 3.1 Firebase Registration Flow

Diagram ini menunjukkan alur registrasi admin baru menggunakan Firebase.

#### PlantUML

```plantuml
@startuml Admin_Registration
title Admin Registration Flow

actor Admin
participant "Frontend" as FE
participant "Firebase Auth" as Firebase
participant "API Gateway" as Gateway
participant "Auth Service\n(Port 3001)" as Auth
database "Supabase" as DB
participant "Kafka" as Kafka

== Frontend Authentication ==
Admin -> FE: Input email & password
FE -> Firebase: createUserWithEmailAndPassword()
activate Firebase
Firebase -> Firebase: Create Firebase User
Firebase --> FE: Firebase ID Token
deactivate Firebase

== Backend Registration ==
FE -> Gateway: POST /auth/register\n{idToken, full_name, role, phone_number}
Gateway -> Auth: Forward Request
activate Auth

Auth -> Firebase: Verify ID Token
activate Firebase
Firebase --> Auth: Decoded Token\n{uid, email}
deactivate Firebase

Auth -> DB: Check existing user\nby email
activate DB
DB --> Auth: No existing user
deactivate DB

Auth -> DB: Check phone number\n(if provided)
activate DB
DB --> Auth: No duplicate
deactivate DB

Auth -> DB: Create Supabase Auth User
activate DB
DB --> Auth: Auth User Created\n{id: supabase_user_id}
deactivate DB

Auth -> DB: Insert user record\n{id, email, full_name, role, firebase_uid}
activate DB
DB --> Auth: User Created
deactivate DB

Auth -> Kafka: Publish "user.registered"\n{userId, email, role}
activate Kafka
Kafka --> Auth: Event Published
deactivate Kafka

Auth --> Gateway: Success Response\n{accessToken, user}
deactivate Auth

Gateway --> FE: Registration Success
FE --> Admin: Registration Complete

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Admin Registration Flow
    
    actor Admin
    participant FE as Frontend
    participant Firebase as Firebase Auth
    participant Gateway as API Gateway
    participant Auth as Auth Service<br/>(Port 3001)
    participant DB as Supabase
    participant Kafka as Kafka
    
    Note over Admin,Kafka: Frontend Authentication
    
    Admin->>FE: Input email & password
    FE->>Firebase: createUserWithEmailAndPassword()
    activate Firebase
    Firebase->>Firebase: Create Firebase User
    Firebase-->>FE: Firebase ID Token
    deactivate Firebase
    
    Note over Admin,Kafka: Backend Registration
    
    FE->>Gateway: POST /auth/register<br/>{idToken, full_name, role}
    Gateway->>Auth: Forward Request
    activate Auth
    
    Auth->>Firebase: Verify ID Token
    activate Firebase
    Firebase-->>Auth: Decoded Token {uid, email}
    deactivate Firebase
    
    Auth->>DB: Check existing user by email
    activate DB
    DB-->>Auth: No existing user
    deactivate DB
    
    Auth->>DB: Create Supabase Auth User
    activate DB
    DB-->>Auth: Auth User Created
    deactivate DB
    
    Auth->>DB: Insert user record
    activate DB
    DB-->>Auth: User Created
    deactivate DB
    
    Auth->>Kafka: Publish "user.registered"
    
    Auth-->>Gateway: Success Response
    deactivate Auth
    
    Gateway-->>FE: Registration Success
    FE-->>Admin: Registration Complete
```

## 4. Sequence Diagram - Admin Login

### 4.1 Firebase Login Flow

Diagram ini menunjukkan alur login admin menggunakan Firebase ID Token.

#### PlantUML

```plantuml
@startuml Admin_Login
title Admin Login Flow

actor Admin
participant "Frontend" as FE
participant "Firebase Auth" as Firebase
participant "API Gateway" as Gateway
participant "Auth Service\n(Port 3001)" as Auth
database "Supabase" as DB
participant "Redis" as Redis

== Firebase Authentication ==
Admin -> FE: Input email & password
FE -> Firebase: signInWithEmailAndPassword()
activate Firebase
Firebase -> Firebase: Validate Credentials
Firebase --> FE: Firebase ID Token
deactivate Firebase

== Backend Validation ==
FE -> Gateway: POST /auth/firebase/login\n{idToken}
Gateway -> Auth: Forward Request
activate Auth

Auth -> Firebase: Verify ID Token
activate Firebase
Firebase --> Auth: Decoded Token\n{uid, email}
deactivate Firebase

Auth -> DB: Find user by email
activate DB
DB --> Auth: User Data\n{id, role, full_name}
deactivate DB

alt User Found
    alt Role is Admin
        Auth -> DB: Update last_login_at
        activate DB
        DB --> Auth: Updated
        deactivate DB
        
        Auth -> Redis: Store session (optional)
        activate Redis
        Redis --> Auth: Session stored
        deactivate Redis
        
        Auth --> Gateway: Success\n{accessToken: idToken, user}
    else Not Admin
        Auth --> Gateway: 403 Forbidden\n"Only admin can login"
    end
else User Not Found
    Auth --> Gateway: 404 Not Found\n"User not found in database"
end

deactivate Auth

Gateway --> FE: Response
FE --> Admin: Login Result

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Admin Login Flow
    
    actor Admin
    participant FE as Frontend
    participant Firebase as Firebase Auth
    participant Gateway as API Gateway
    participant Auth as Auth Service<br/>(Port 3001)
    participant DB as Supabase
    participant Redis as Redis
    
    Note over Admin,Redis: Firebase Authentication
    
    Admin->>FE: Input email & password
    FE->>Firebase: signInWithEmailAndPassword()
    activate Firebase
    Firebase->>Firebase: Validate Credentials
    Firebase-->>FE: Firebase ID Token
    deactivate Firebase
    
    Note over Admin,Redis: Backend Validation
    
    FE->>Gateway: POST /auth/firebase/login<br/>{idToken}
    Gateway->>Auth: Forward Request
    activate Auth
    
    Auth->>Firebase: Verify ID Token
    activate Firebase
    Firebase-->>Auth: Decoded Token {uid, email}
    deactivate Firebase
    
    Auth->>DB: Find user by email
    activate DB
    DB-->>Auth: User Data {id, role}
    deactivate DB
    
    alt User Found & Role is Admin
        Auth->>DB: Update last_login_at
        DB-->>Auth: Updated
        
        Auth->>Redis: Store session (optional)
        Redis-->>Auth: Session stored
        
        Auth-->>Gateway: Success {accessToken, user}
    else Not Admin
        Auth-->>Gateway: 403 Forbidden
    else User Not Found
        Auth-->>Gateway: 404 Not Found
    end
    
    deactivate Auth
    
    Gateway-->>FE: Response
    FE-->>Admin: Login Result
```

## 5. Sequence Diagram - Get Current User

### 5.1 Get Me Flow

Diagram ini menunjukkan alur untuk mendapatkan informasi user yang sedang login.

#### PlantUML

```plantuml
@startuml Get_Me
title Get Current User Flow

actor Admin
participant "Frontend" as FE
participant "API Gateway" as Gateway
participant "Auth Service" as Auth
participant "Firebase Auth" as Firebase
database "Supabase" as DB

FE -> Gateway: GET /auth/me\n(Authorization: Bearer {token})
Gateway -> Auth: Forward Request
activate Auth

Auth -> Auth: Extract Bearer Token

Auth -> Firebase: Verify Token
activate Firebase
Firebase --> Auth: Decoded Token {uid, email}
deactivate Firebase

Auth -> DB: Find user by firebase_uid OR email
activate DB
DB --> Auth: User Data
deactivate DB

alt User Found
    Auth --> Gateway: 200 OK\n{user: {...}}
else User Not Found
    Auth --> Gateway: 404 Not Found
end

deactivate Auth

Gateway --> FE: Response
FE --> Admin: Display User Info

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Get Current User Flow
    
    actor Admin
    participant FE as Frontend
    participant Gateway as API Gateway
    participant Auth as Auth Service
    participant Firebase as Firebase Auth
    participant DB as Supabase
    
    FE->>Gateway: GET /auth/me<br/>(Authorization: Bearer token)
    Gateway->>Auth: Forward Request
    activate Auth
    
    Auth->>Auth: Extract Bearer Token
    
    Auth->>Firebase: Verify Token
    activate Firebase
    Firebase-->>Auth: Decoded Token {uid, email}
    deactivate Firebase
    
    Auth->>DB: Find user by firebase_uid
    activate DB
    DB-->>Auth: User Data
    deactivate DB
    
    alt User Found
        Auth-->>Gateway: 200 OK {user}
    else User Not Found
        Auth-->>Gateway: 404 Not Found
    end
    
    deactivate Auth
    
    Gateway-->>FE: Response
    FE-->>Admin: Display User Info
```

## 6. Sequence Diagram - Logout

### 6.1 Logout Flow

Diagram ini menunjukkan alur logout admin.

#### PlantUML

```plantuml
@startuml Logout
title Admin Logout Flow

actor Admin
participant "Frontend" as FE
participant "Firebase Auth" as Firebase
participant "API Gateway" as Gateway
participant "Auth Service" as Auth
participant "Redis" as Redis

== Backend Logout ==
FE -> Gateway: POST /auth/logout\n(Authorization: Bearer {token})
Gateway -> Auth: Forward Request
activate Auth

Auth -> Auth: Verify Token
Auth -> Redis: Remove Session (if exists)
activate Redis
Redis --> Auth: Session Removed
deactivate Redis

Auth --> Gateway: 200 OK\n{message: "Logged out successfully"}
deactivate Auth

Gateway --> FE: Logout Success

== Frontend Cleanup ==
FE -> Firebase: signOut()
activate Firebase
Firebase --> FE: Signed Out
deactivate Firebase

FE -> FE: Clear Local Storage/Cookies
FE --> Admin: Redirect to Login

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Admin Logout Flow
    
    actor Admin
    participant FE as Frontend
    participant Firebase as Firebase Auth
    participant Gateway as API Gateway
    participant Auth as Auth Service
    participant Redis as Redis
    
    Note over FE,Redis: Backend Logout
    
    FE->>Gateway: POST /auth/logout<br/>(Authorization: Bearer token)
    Gateway->>Auth: Forward Request
    activate Auth
    
    Auth->>Auth: Verify Token
    Auth->>Redis: Remove Session
    activate Redis
    Redis-->>Auth: Session Removed
    deactivate Redis
    
    Auth-->>Gateway: 200 OK
    deactivate Auth
    
    Gateway-->>FE: Logout Success
    
    Note over FE,Firebase: Frontend Cleanup
    
    FE->>Firebase: signOut()
    Firebase-->>FE: Signed Out
    
    FE->>FE: Clear Local Storage
    FE-->>Admin: Redirect to Login
```

## 7. Sequence Diagram - Password Reset

### 7.1 Password Reset Flow

Diagram ini menunjukkan alur reset password melalui Firebase.

#### PlantUML

```plantuml
@startuml Password_Reset
title Password Reset Flow

actor Admin
participant "Frontend" as FE
participant "API Gateway" as Gateway
participant "Auth Service" as Auth
participant "Firebase Auth" as Firebase

Admin -> FE: Request Password Reset\n(Enter email)

FE -> Gateway: POST /auth/firebase/reset-password\n{email}
Gateway -> Auth: Forward Request
activate Auth

Auth -> Firebase: sendPasswordResetEmail(email)
activate Firebase
Firebase --> Auth: Reset Email Sent
deactivate Firebase

Auth --> Gateway: 200 OK\n{message: "Password reset email sent"}
deactivate Auth

Gateway --> FE: Success Response
FE --> Admin: "Check your email"

== Email Flow ==
Firebase --> Admin: Password Reset Email

Admin -> Admin: Click Reset Link
Admin -> Firebase: Enter New Password
Firebase -> Firebase: Update Password
Firebase --> Admin: Password Updated

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Password Reset Flow
    
    actor Admin
    participant FE as Frontend
    participant Gateway as API Gateway
    participant Auth as Auth Service
    participant Firebase as Firebase Auth
    
    Admin->>FE: Request Password Reset (Enter email)
    
    FE->>Gateway: POST /auth/firebase/reset-password<br/>{email}
    Gateway->>Auth: Forward Request
    activate Auth
    
    Auth->>Firebase: sendPasswordResetEmail(email)
    activate Firebase
    Firebase-->>Auth: Reset Email Sent
    deactivate Firebase
    
    Auth-->>Gateway: 200 OK
    deactivate Auth
    
    Gateway-->>FE: Success Response
    FE-->>Admin: "Check your email"
    
    Note over Admin,Firebase: Email Flow
    
    Firebase-->>Admin: Password Reset Email
    Admin->>Admin: Click Reset Link
    Admin->>Firebase: Enter New Password
    Firebase->>Firebase: Update Password
    Firebase-->>Admin: Password Updated
```

## 8. Error Handling

### 8.1 Authentication Error Flow

Diagram ini menunjukkan penanganan error saat autentikasi.

#### PlantUML

```plantuml
@startuml Auth_Error_Handling
title Authentication Error Handling

actor Admin
participant "API Gateway" as Gateway
participant "Auth Service" as Auth
participant "Firebase Auth" as Firebase

Admin -> Gateway: Request with Invalid Token
Gateway -> Auth: Forward Request
activate Auth

Auth -> Firebase: Verify Token
activate Firebase
Firebase --> Auth: Error: Token Expired
deactivate Firebase

Auth -> Auth: Map Error Code

alt Token Expired
    Auth --> Gateway: 401\n{code: "AUTH_TOKEN_EXPIRED"}
else Token Invalid
    Auth --> Gateway: 401\n{code: "AUTH_TOKEN_INVALID"}
else Verification Failed
    Auth --> Gateway: 401\n{code: "AUTH_VERIFICATION_FAILED"}
else User Not Found
    Auth --> Gateway: 404\n{code: "USER_NOT_FOUND"}
else Insufficient Permissions
    Auth --> Gateway: 403\n{code: "AUTH_INSUFFICIENT_PERMISSIONS"}
end

deactivate Auth

Gateway --> Admin: Error Response

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Authentication Error Handling
    
    actor Admin
    participant Gateway as API Gateway
    participant Auth as Auth Service
    participant Firebase as Firebase Auth
    
    Admin->>Gateway: Request with Invalid Token
    Gateway->>Auth: Forward Request
    activate Auth
    
    Auth->>Firebase: Verify Token
    activate Firebase
    Firebase-->>Auth: Error: Token Expired
    deactivate Firebase
    
    Auth->>Auth: Map Error Code
    
    alt Token Expired
        Auth-->>Gateway: 401 {code: "AUTH_TOKEN_EXPIRED"}
    else Token Invalid
        Auth-->>Gateway: 401 {code: "AUTH_TOKEN_INVALID"}
    else User Not Found
        Auth-->>Gateway: 404 {code: "USER_NOT_FOUND"}
    else Insufficient Permissions
        Auth-->>Gateway: 403 {code: "AUTH_INSUFFICIENT_PERMISSIONS"}
    end
    
    deactivate Auth
    
    Gateway-->>Admin: Error Response
```

## 9. Endpoint Summary

### 9.1 Public Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | /auth/register | Registrasi admin baru |
| POST | /auth/login | Login admin |
| POST | /auth/firebase/register | Registrasi via Firebase |
| POST | /auth/firebase/login | Login via Firebase |
| POST | /auth/firebase/reset-password | Request reset password |

### 9.2 Protected Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | /auth/me | Get current user info |
| POST | /auth/logout | Logout user |

## 10. Data Flow Summary

```
Frontend → Firebase Auth → ID Token
     ↓
API Gateway → Auth Service → Firebase Verification
     ↓
Supabase (User Database) → User Data
     ↓
Response with Access Token
```
