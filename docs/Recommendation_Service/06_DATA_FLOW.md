# Data Flow Diagrams & Sequences

## 1. Complete Assessment Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React)                            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1. Display Assessment Questions (28 questions)              │  │
│  │    - Section A: Profile (age, practice hours)               │  │
│  │    - Section B: Goals & Genres                              │  │
│  │    - Section C: Experience                                  │  │
│  │    - Section D: Preferences                                 │  │
│  │    - Section E: Learning Style                              │  │
│  │    - Section F: Logistics                                   │  │
│  │    - Section G: Direction & Interests                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 2. User Answers Questions                                   │  │
│  │    - Real-time validation                                   │  │
│  │    - Progress indicator                                     │  │
│  │    - Save draft option                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 3. Submit Assessment                                        │  │
│  │    - POST /api/assessment/submit                            │  │
│  │    - Include session cookie (automatic)                    │  │
│  │    - Show loading state                                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTP POST
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Port 3000)                           │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ • Validate session cookie                                  │  │
│  │ • Create session if not exists                             │  │
│  │ • Route to recommendation service                          │  │
│  │ • Add request ID for tracing                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTP POST
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│         RECOMMENDATION SERVICE (Port 3005) - Orchestrator            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 4. Receive & Validate Request                               │  │
│  │    - Validate session data from Redis                       │  │
│  │    - Validate assessment data                               │  │
│  │    - Check rate limits                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 5. Persist Data & Publish Event                             │  │
│  │    - Save to test_assessment table                           │  │
│  │    - Publish "assessment_submitted" event to broker         │  │
│  │    - Return assessment_id (202 Accepted)                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Event: assessment_submitted
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 AI-WORKER SERVICE - Event Consumer                   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 6. Consume Event & Process AI                               │  │
│  │    - Receive assessment_submitted event                      │  │
│  │    - Build AI prompt from event data                        │  │
│  │    - Call OpenAI API                                        │  │
│  │    - Parse AI response                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 7. Save Results & Publish Completion                        │  │
│  │    - Save to result_test table                               │  │
│  │    - Update test_assessment status                           │  │
│  │    - Publish "recommendation_completed" event (optional)     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Polling/WebSocket
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React)                            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 8. Display Results                                          │  │
│  │    - Poll GET /api/assessment/:id/status                    │  │
│  │    - Fetch GET /api/assessment/:id/results                  │  │
│  │    - Show personalized recommendations                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ ORCHESTRATOR: Answer Receiver & Persistence               │  │
│  │ • Validate input schema                                     │  │
│  │ • Save answers to test_assessment table                     │  │
│  │ • Publish "assessment_submitted" event to broker            │  │
│  │ • Return assessment_id (202 Accepted)                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│                    ↓ Message Broker: assessment_submitted            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ AI-WORKER: Event Consumer & AI Processor                   │  │
│  │ • Consume "assessment_submitted" event                      │  │
│  │ • Build AI prompt from assessment data                      │  │
│  │ • Call external AI service (OpenAI/Claude)                  │  │
│  │ • Parse AI response                                         │  │
│  │ • Save results to result_test table                         │  │
│  │ • Update assessment status to "completed"                   │  │
│  │ • Publish "recommendation_completed" event                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
            ┌──────────────┐ ┌──────────┐ ┌──────────┐
            │  Supabase    │ │  Redis   │ │   AI     │
            │  Database    │ │  Cache   │ │ Service  │
            └──────────────┘ └──────────┘ └──────────┘
                    │
                    │ (Stored in result_test table)
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React)                            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 4. Poll for Results                                         │  │
│  │    - GET /api/assessment/:id/status (with session cookie)   │  │
│  │    - Poll every 2 seconds                                   │  │
│  │    - Show processing progress                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 5. Display Results                                          │  │
│  │    - GET /api/assessment/:id/results (with session cookie)  │  │
│  │    - Show recommendations                                   │  │
│  │    - Display analysis & insights                            │  │
│  │    - Provide next steps                                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. Sequence Diagram - Happy Path

```
User          Frontend        API Gateway    Recommendation Service    Database    AI Service
 │               │                 │                    │                │            │
 │─ Answer Q's ──│                 │                    │                │            │
 │               │                 │                    │                │            │
 │─ Submit ──────│                 │                    │                │            │
 │               │─ POST /submit ──│                    │                │            │
 │               │                 │─ POST /submit ────│                │            │
 │               │                 │                    │─ Validate ────│            │
 │               │                 │                    │                │            │
 │               │                 │                    │─ Create Record│            │
 │               │                 │                    │                │            │
 │               │                 │                    │─ Publish Queue│            │
 │               │                 │                    │                │            │
 │               │                 │◄─ 202 Accepted ───│                │            │
 │               │◄─ 202 Accepted ─│                    │                │            │
 │               │                 │                    │                │            │
 │               │                 │                    │ (Worker 2)     │            │
 │               │                 │                    │─ Save Data ───│            │
 │               │                 │                    │                │            │
 │               │                 │                    │ (Worker 3)     │            │
 │               │                 │                    │─ Build Prompt │            │
 │               │                 │                    │─ Call AI ──────────────────│
 │               │                 │                    │                │            │
 │               │                 │                    │◄─ AI Response ─────────────│
 │               │                 │                    │                │            │
 │               │                 │                    │─ Parse & Save │            │
 │               │                 │                    │                │            │
 │─ Poll Status ─│                 │                    │                │            │
 │               │─ GET /status ───│                    │                │            │
 │               │                 │─ GET /status ─────│                │            │
 │               │                 │                    │─ Query DB ────│            │
 │               │                 │                    │◄─ Status ─────│            │
 │               │◄─ 200 OK ───────│                    │                │            │
 │               │                 │                    │                │            │
 │─ Get Results ─│                 │                    │                │            │
 │               │─ GET /results ──│                    │                │            │
 │               │                 │─ GET /results ────│                │            │
 │               │                 │                    │─ Query DB ────│            │
 │               │                 │                    │◄─ Results ────│            │
 │               │◄─ 200 OK ───────│                    │                │            │
 │               │                 │                    │                │            │
 │─ View Results │                 │                    │                │            │
 │               │                 │                    │                │            │
```

## 3. Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Error Scenarios                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. Validation Error (Orchestrator)                           │
│    └─ Return 400 Bad Request immediately                    │
│                                                              │
│ 2. Database Error (Orchestrator)                             │
│    └─ Retry with exponential backoff                        │
│    └─ Max 3 retries, then return 500 Internal Server Error  │
│                                                              │
│ 3. Message Broker Error (Orchestrator/AI-Worker)            │
│    └─ Retry publishing/consuming with backoff               │
│    └─ Max 3 retries, then move to DLQ                       │
│                                                              │
│ 4. AI Service Error (AI-Worker)                              │
│    └─ Retry with exponential backoff                        │
│    └─ Max 3 retries                                         │
│    └─ Use fallback recommendations if all retries fail      │
│    └─ Mark assessment as "completed_with_fallback"          │
│                                                              │
│ 5. Timeout Error                                            │
│    └─ Return 504 Gateway Timeout                            │
│    └─ Client can retry or check status later                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 4. Data Transformation Pipeline

```
Raw User Input
      │
      ▼
┌──────────────────────────────────────┐
│ Validation & Normalization           │
│ - Type checking                      │
│ - Range validation                   │
│ - Array deduplication                │
└──────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────┐
│ Database Storage (test_assessment)   │
│ - Store as-is for audit trail        │
│ - Preserve original answers          │
└──────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────┐
│ Prompt Building                      │
│ - Format for AI consumption          │
│ - Add context & instructions         │
│ - Include system prompt              │
└──────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────┐
│ AI Processing                        │
│ - Send to AI service                 │
│ - Receive structured response        │
└──────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────┐
│ Response Parsing & Validation        │
│ - Extract JSON                       │
│ - Validate schema                    │
│ - Transform to DB format             │
└──────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────┐
│ Database Storage (result_test)       │
│ - Store recommendations              │
│ - Store analysis & insights          │
│ - Store AI metadata                  │
└──────────────────────────────────────┘
      │
      ▼
Frontend Display
```

