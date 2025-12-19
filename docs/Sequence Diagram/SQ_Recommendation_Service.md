# Sequence Diagram - Recommendation Service

## 1. Gambaran Umum

Recommendation Service adalah layanan untuk memberikan rekomendasi kursus musik berbasis AI. Service ini berjalan pada Port 3005 dan bertanggung jawab untuk:

- **Assessment Submission**: Menerima dan menyimpan data assessment siswa
- **AI Processing**: Memproses assessment menggunakan Google AI API
- **Result Generation**: Menghasilkan rekomendasi kursus, level, dan tipe kelas
- **WebSocket Broadcasting**: Mengirim notifikasi real-time saat hasil siap

## 2. Arsitektur Service

Recommendation Service menggunakan anonymous session untuk mengidentifikasi pengguna tanpa login, Google AI untuk analisis, dan Kafka untuk notifikasi.

### 2.1 Komponen Integrasi

| Komponen | Fungsi |
|----------|--------|
| Supabase | Penyimpanan assessment dan result |
| Redis | Session management, processing queue |
| Google AI API | AI-powered analysis |
| Kafka | Event publishing |
| WebSocket | Real-time result notification |

### 2.2 Session Flow

Pengguna menggunakan anonymous session (cookie-based) untuk tracking assessment tanpa perlu login.

## 3. Sequence Diagram - Submit Assessment

### 3.1 Assessment Submission Flow

Diagram ini menunjukkan alur lengkap submission assessment dan processing AI.

#### PlantUML

```plantuml
@startuml Submit_Assessment
title Assessment Submission Flow

actor User
participant "API Gateway" as Gateway
participant "Recommendation Service\n(Port 3005)" as RecommendSvc
participant "Redis" as Redis
database "Supabase" as DB
participant "Google AI" as AI
participant "Kafka" as Kafka
participant "WebSocket Server" as WS

== Session Initialization ==
User -> Gateway: POST /assessment\n(Cookie: session_id or none)
Gateway -> RecommendSvc: Forward Request
activate RecommendSvc

RecommendSvc -> RecommendSvc: Anonymous Session Middleware

alt No Session Cookie
    RecommendSvc -> RecommendSvc: Generate New Session ID
    RecommendSvc -> RecommendSvc: Set Cookie\n(session_id=xxx, httpOnly, 7 days)
end

== Assessment Submission ==
RecommendSvc -> RecommendSvc: Validate Request Body\n(Zod Schema)

alt Validation Failed
    RecommendSvc --> Gateway: 400 Bad Request\n{code: "VALIDATION_ERROR"}
else Validation Passed
    RecommendSvc -> DB: INSERT INTO test_assessment\n{session_id, assessment_data, status: 'submitted'}
    activate DB
    DB --> RecommendSvc: New Assessment Record\n{id: assessment_id}
    deactivate DB
    
    RecommendSvc -> Redis: LPUSH assessment_queue\n{assessment_id, session_id}
    activate Redis
    Redis --> RecommendSvc: Queued
    deactivate Redis
    
    RecommendSvc -> Kafka: Publish "assessment.submitted"\n{assessment_id, session_id}
    activate Kafka
    Kafka --> RecommendSvc: Published
    deactivate Kafka
    
    RecommendSvc --> Gateway: 201 Created\n{assessment_id, status: 'submitted',\nmessage: 'AI analysis in progress'}
end

== Background AI Processing ==
note right of RecommendSvc: setImmediate (non-blocking)

RecommendSvc -> DB: SELECT assessment_data\nFROM test_assessment\nWHERE id = :assessment_id
activate DB
DB --> RecommendSvc: Assessment Data
deactivate DB

RecommendSvc -> AI: Generate AI Recommendations\n(prompt with assessment data)
activate AI
AI --> RecommendSvc: AI Analysis Result\n{recommendations, analysis, practical_advice}
deactivate AI

RecommendSvc -> DB: INSERT INTO result_test\n{assessment_id, session_id,\nai_analysis, status: 'completed'}
activate DB
DB --> RecommendSvc: Result Saved
deactivate DB

RecommendSvc -> DB: UPDATE test_assessment\nSET status = 'completed'\nWHERE id = :assessment_id
activate DB
DB --> RecommendSvc: Status Updated
deactivate DB

RecommendSvc -> WS: Broadcast Recommendation Result\n{session_id, assessment_id, ai_analysis}
WS --> User: Real-time Notification

deactivate RecommendSvc

Gateway --> User: Initial Response\n(Assessment Submitted)

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Assessment Submission Flow
    
    actor User
    participant Gateway as API Gateway
    participant RecommendSvc as Recommendation Service<br/>(Port 3005)
    participant Redis as Redis
    participant DB as Supabase
    participant AI as Google AI
    participant Kafka as Kafka
    participant WS as WebSocket Server
    
    Note over User,WS: Session Initialization
    
    User->>Gateway: POST /assessment<br/>(Cookie: session_id)
    Gateway->>RecommendSvc: Forward Request
    activate RecommendSvc
    
    RecommendSvc->>RecommendSvc: Anonymous Session Middleware
    
    alt No Session Cookie
        RecommendSvc->>RecommendSvc: Generate & Set Session Cookie
    end
    
    Note over User,WS: Assessment Submission
    
    RecommendSvc->>RecommendSvc: Validate Request (Zod)
    
    alt Validation Failed
        RecommendSvc-->>Gateway: 400 Bad Request
    else Validation Passed
        RecommendSvc->>DB: INSERT INTO test_assessment
        DB-->>RecommendSvc: assessment_id
        
        RecommendSvc->>Redis: Add to processing queue
        
        RecommendSvc->>Kafka: Publish "assessment.submitted"
        
        RecommendSvc-->>Gateway: 201 Created<br/>{assessment_id, status}
    end
    
    Note over RecommendSvc,WS: Background AI Processing
    
    RecommendSvc->>DB: Get assessment data
    DB-->>RecommendSvc: Assessment Data
    
    RecommendSvc->>AI: Generate AI Recommendations
    AI-->>RecommendSvc: AI Analysis Result
    
    RecommendSvc->>DB: INSERT INTO result_test
    
    RecommendSvc->>DB: UPDATE assessment status
    
    RecommendSvc->>WS: Broadcast Result
    WS-->>User: Real-time Notification
    
    deactivate RecommendSvc
    
    Gateway-->>User: Initial Response
```

## 4. Sequence Diagram - Get Results

### 4.1 Get Results by Session ID

Diagram ini menunjukkan alur pengambilan hasil assessment berdasarkan session ID.

#### PlantUML

```plantuml
@startuml Get_Results_Session
title Get Results by Session ID Flow

actor User
participant "API Gateway" as Gateway
participant "Recommendation Service" as RecommendSvc
database "Supabase" as DB

User -> Gateway: GET /results\n(Cookie: session_id=xxx)
Gateway -> RecommendSvc: Forward Request
activate RecommendSvc

RecommendSvc -> RecommendSvc: Anonymous Session Middleware\n(Extract session_id from cookie)

alt No Session ID or Assessment ID
    RecommendSvc --> Gateway: 400 Bad Request\n{code: "MISSING_IDENTIFIER"}
else Has Session ID

    RecommendSvc -> DB: SELECT * FROM test_assessment\nWHERE session_id = :session_id\nORDER BY created_at DESC\nLIMIT 1
    activate DB
    DB --> RecommendSvc: Assessment Data or null
    deactivate DB
    
    alt Assessment Not Found
        RecommendSvc --> Gateway: 404 Not Found\n{code: "NOT_FOUND",\nmessage: "Assessment not found for this session"}
    else Assessment Found
    
        RecommendSvc -> DB: SELECT * FROM result_test\nWHERE session_id = :session_id\nORDER BY created_at DESC\nLIMIT 1
        activate DB
        DB --> RecommendSvc: Result Data or null
        deactivate DB
        
        alt Result Not Found
            RecommendSvc --> Gateway: 200 OK\n{assessment, result: null,\nstatus: 'processing'}
        else Result Found
            RecommendSvc --> Gateway: 200 OK\n{assessment, result,\nstatus: 'completed'}
        end
    end
end

deactivate RecommendSvc

Gateway --> User: Results Response

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Get Results by Session ID Flow
    
    actor User
    participant Gateway as API Gateway
    participant RecommendSvc as Recommendation Service
    participant DB as Supabase
    
    User->>Gateway: GET /results<br/>(Cookie: session_id=xxx)
    Gateway->>RecommendSvc: Forward Request
    activate RecommendSvc
    
    RecommendSvc->>RecommendSvc: Extract session_id from cookie
    
    alt No Session ID
        RecommendSvc-->>Gateway: 400 Bad Request
    else Has Session ID
        RecommendSvc->>DB: SELECT assessment by session_id
        DB-->>RecommendSvc: Assessment Data
        
        alt Assessment Not Found
            RecommendSvc-->>Gateway: 404 Not Found
        else Assessment Found
            RecommendSvc->>DB: SELECT result by session_id
            DB-->>RecommendSvc: Result Data
            
            alt Result Not Found
                RecommendSvc-->>Gateway: 200 OK {status: 'processing'}
            else Result Found
                RecommendSvc-->>Gateway: 200 OK {assessment, result}
            end
        end
    end
    
    deactivate RecommendSvc
    
    Gateway-->>User: Results Response
```

### 4.2 Get Results by Assessment ID

Diagram ini menunjukkan alur pengambilan hasil berdasarkan assessment ID dengan validasi session.

#### PlantUML

```plantuml
@startuml Get_Results_Assessment
title Get Results by Assessment ID Flow

actor User
participant "API Gateway" as Gateway
participant "Recommendation Service" as RecommendSvc
database "Supabase" as DB

User -> Gateway: GET /results?assessment_id=abc123\n(Cookie: session_id=xxx)
Gateway -> RecommendSvc: Forward Request
activate RecommendSvc

RecommendSvc -> RecommendSvc: Extract session_id and assessment_id

RecommendSvc -> DB: SELECT * FROM result_test\nWHERE assessment_id = :assessment_id
activate DB
DB --> RecommendSvc: Result Data
deactivate DB

alt Result Not Found
    RecommendSvc --> Gateway: 404 Not Found\n{code: "NOT_FOUND"}
else Result Found
    RecommendSvc -> RecommendSvc: Validate Session Match

    alt Session Mismatch
        RecommendSvc --> Gateway: 403 Forbidden\n{code: "SESSION_MISMATCH",\nmessage: "Session ID does not match the assessment"}
    else Session Matches
        RecommendSvc -> DB: SELECT * FROM test_assessment\nWHERE id = :assessment_id
        activate DB
        DB --> RecommendSvc: Assessment Data
        deactivate DB
        
        RecommendSvc --> Gateway: 200 OK\n{assessment, result,\nstatus: result.status}
    end
end

deactivate RecommendSvc

Gateway --> User: Results Response

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Get Results by Assessment ID Flow
    
    actor User
    participant Gateway as API Gateway
    participant RecommendSvc as Recommendation Service
    participant DB as Supabase
    
    User->>Gateway: GET /results?assessment_id=abc123<br/>(Cookie: session_id=xxx)
    Gateway->>RecommendSvc: Forward Request
    activate RecommendSvc
    
    RecommendSvc->>RecommendSvc: Extract identifiers
    
    RecommendSvc->>DB: SELECT result by assessment_id
    DB-->>RecommendSvc: Result Data
    
    alt Result Not Found
        RecommendSvc-->>Gateway: 404 Not Found
    else Result Found
        RecommendSvc->>RecommendSvc: Validate Session Match
        
        alt Session Mismatch
            RecommendSvc-->>Gateway: 403 Forbidden
        else Session Matches
            RecommendSvc->>DB: Get assessment data
            DB-->>RecommendSvc: Assessment Data
            RecommendSvc-->>Gateway: 200 OK {assessment, result}
        end
    end
    
    deactivate RecommendSvc
    
    Gateway-->>User: Results Response
```

## 5. Sequence Diagram - AI Processing

### 5.1 AI Recommendation Generation Flow

Diagram ini menunjukkan detail proses AI untuk menghasilkan rekomendasi.

#### PlantUML

```plantuml
@startuml AI_Processing
title AI Recommendation Generation Flow

participant "Recommendation Service" as RecommendSvc
participant "Google AI API" as AI
database "Supabase" as DB
participant "WebSocket" as WS

RecommendSvc -> RecommendSvc: processAssessmentWithAI()\n(background process)
activate RecommendSvc

RecommendSvc -> DB: SELECT assessment_data\nFROM test_assessment\nWHERE id = :assessment_id
activate DB
DB --> RecommendSvc: Assessment Data\n{questions: {...}}
deactivate DB

RecommendSvc -> RecommendSvc: Build AI Prompt\n(analyze questions,\napply Shema Music rules)

alt Google AI Available
    RecommendSvc -> AI: generateContent(prompt)\n(Gemini API)
    activate AI
    AI --> RecommendSvc: AI Response\n(structured analysis)
    deactivate AI
    
    RecommendSvc -> RecommendSvc: Parse AI Response\n(extract recommendations)
else AI Unavailable or Error
    RecommendSvc -> RecommendSvc: Generate Mock Response\n(fallback logic)
    note right: Uses rule-based\nrecommendations
end

RecommendSvc -> RecommendSvc: Build Final Analysis\n{recommendations, analysis, practical_advice}

RecommendSvc -> DB: INSERT INTO result_test\n{assessment_id, session_id,\nai_analysis, status: 'completed'}
activate DB
DB --> RecommendSvc: Result Saved
deactivate DB

RecommendSvc -> DB: UPDATE test_assessment\nSET status = 'completed'
activate DB
DB --> RecommendSvc: Updated
deactivate DB

RecommendSvc -> WS: Broadcast Result\n(via Notification Service)
activate WS
WS --> WS: Route to matching\nWebSocket clients
deactivate WS

deactivate RecommendSvc

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title AI Recommendation Generation Flow
    
    participant RecommendSvc as Recommendation Service
    participant AI as Google AI API
    participant DB as Supabase
    participant WS as WebSocket
    
    RecommendSvc->>RecommendSvc: processAssessmentWithAI()
    activate RecommendSvc
    
    RecommendSvc->>DB: Get assessment data
    DB-->>RecommendSvc: Assessment Data
    
    RecommendSvc->>RecommendSvc: Build AI Prompt
    
    alt Google AI Available
        RecommendSvc->>AI: generateContent(prompt)
        AI-->>RecommendSvc: AI Response
        RecommendSvc->>RecommendSvc: Parse AI Response
    else AI Unavailable
        RecommendSvc->>RecommendSvc: Generate Mock Response
    end
    
    RecommendSvc->>RecommendSvc: Build Final Analysis
    
    RecommendSvc->>DB: INSERT INTO result_test
    
    RecommendSvc->>DB: UPDATE assessment status
    
    RecommendSvc->>WS: Broadcast Result
    
    deactivate RecommendSvc
```

## 6. Sequence Diagram - WebSocket Notification

### 6.1 Real-time Result Notification Flow

Diagram ini menunjukkan alur notifikasi real-time saat hasil assessment siap.

#### PlantUML

```plantuml
@startuml WebSocket_Notification
title Real-time Result Notification Flow

actor User
participant "Browser" as Browser
participant "API Gateway\n/ws/availability" as WS_Gateway
participant "Kafka" as Kafka
participant "Recommendation Service" as RecommendSvc

== Initial WebSocket Connection ==
Browser -> WS_Gateway: WebSocket Connect\n(/ws/availability)
WS_Gateway -> WS_Gateway: Generate Client ID
WS_Gateway --> Browser: Connection Established

Browser -> WS_Gateway: Subscribe\n{type: "subscribe",\nsession_id: "xxx",\nfilters: {...}}
WS_Gateway -> WS_Gateway: Store Subscription\n(filter by session_id)
WS_Gateway --> Browser: Subscribed

== Result Ready Notification ==
RecommendSvc -> Kafka: Publish "admin.notifications"\n{type: "recommendation_result",\nsession_id: "xxx",\nassessment_id: "abc",\nstatus: "completed"}
activate Kafka
Kafka --> RecommendSvc: Published
deactivate Kafka

Kafka -> WS_Gateway: Consume Event
WS_Gateway -> WS_Gateway: Match Subscriptions\n(filter by session_id)
WS_Gateway --> Browser: Push Notification\n{\n  type: "recommendation_result",\n  assessment_id: "abc",\n  status: "completed"\n}

Browser -> Browser: Handle Notification\n(fetch results or show alert)

Browser -> User: "Your results are ready!"

@enduml
```

#### Mermaid

```mermaid
sequenceDiagram
    title Real-time Result Notification Flow
    
    actor User
    participant Browser as Browser
    participant WSGateway as API Gateway<br/>/ws/availability
    participant Kafka as Kafka
    participant RecommendSvc as Recommendation Service
    
    Note over Browser,RecommendSvc: Initial WebSocket Connection
    
    Browser->>WSGateway: WebSocket Connect
    WSGateway-->>Browser: Connection Established
    
    Browser->>WSGateway: Subscribe<br/>{session_id: "xxx"}
    WSGateway-->>Browser: Subscribed
    
    Note over Browser,RecommendSvc: Result Ready Notification
    
    RecommendSvc->>Kafka: Publish result notification
    Kafka->>WSGateway: Consume Event
    
    WSGateway->>WSGateway: Match Subscriptions
    WSGateway-->>Browser: Push Notification<br/>{type: "recommendation_result"}
    
    Browser->>Browser: Handle Notification
    Browser-->>User: "Your results are ready!"
```

## 7. AI Analysis Output Structure

### 7.1 Recommendations Object

```
recommendations: {
  instruments: ["Piano", "Guitar"],
  skill_level: "beginner" | "intermediate" | "advanced",
  class_type: "Kelas Siswa" | "Kelas Karyawan",
  class_style: "Reguler" | "Hobby" | "Ministry",
  learning_path: "Deskripsi path pembelajaran",
  estimated_budget: "300000"
}
```

### 7.2 Analysis Object

```
analysis: {
  instrument_reasoning: "Alasan pemilihan instrument",
  skill_level_reasoning: "Alasan penentuan level",
  class_type_reasoning: "Alasan pemilihan tipe kelas",
  class_style_reasoning: "Alasan pemilihan gaya pembelajaran",
  strengths: ["Kekuatan 1", "Kekuatan 2"],
  areas_for_improvement: ["Area pengembangan 1"],
  potential_challenges: ["Tantangan potensial 1"],
  success_factors: ["Faktor keberhasilan 1"]
}
```

### 7.3 Practical Advice Object

```
practical_advice: {
  practice_routine: "Rekomendasi rutinitas latihan",
  equipment: ["Peralatan 1", "Peralatan 2"],
  next_steps: ["Langkah selanjutnya 1", "Langkah 2"]
}
```

## 8. Assessment Status Flow

```
submitted → processing → completed
              ↓
            failed
```

| Status | Description |
|--------|-------------|
| submitted | Assessment diterima, menunggu processing |
| processing | AI sedang menganalisis |
| completed | Hasil siap |
| failed | AI processing gagal |

## 9. Error Handling

### 9.1 AI Processing Error

Ketika Google AI tidak tersedia atau gagal, sistem menggunakan fallback logic:

- Rule-based recommendations berdasarkan data assessment
- Mock data yang konsisten berdasarkan pertanyaan yang dijawab
- Status tetap "completed" dengan hasil fallback

### 9.2 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid assessment data |
| MISSING_IDENTIFIER | 400 | No session_id or assessment_id |
| NOT_FOUND | 404 | Assessment/result not found |
| SESSION_MISMATCH | 403 | Session doesn't match assessment |
| DATABASE_ERROR | 500 | Database operation failed |
| INTERNAL_ERROR | 500 | Unexpected server error |

## 10. Endpoint Summary

### 10.1 Session-based Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | /assessment | Submit assessment data |
| GET | /results | Get assessment results |
| GET | /results?assessment_id=xxx | Get results by assessment ID |

## 11. Integration Points

### 11.1 Event Topics

| Topic | Publisher | Consumer | Description |
|-------|-----------|----------|-------------|
| assessment.submitted | Recommendation | Admin WS | New assessment submitted |
| admin.notifications | Recommendation | WebSocket | Result ready notification |

### 11.2 WebSocket Subscriptions

- `/ws/availability` - Subscribe dengan filter `session_id` untuk mendapat notifikasi hasil
- `/ws` - Admin notifications untuk monitoring semua assessment
